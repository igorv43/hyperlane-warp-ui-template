import {
  ProviderType,
  TypedTransactionReceipt,
  WarpCore,
  WarpTxCategory,
} from '@hyperlane-xyz/sdk';
import { ProtocolType, toTitleCase, toWei } from '@hyperlane-xyz/utils';
import {
  getAccountAddressForChain,
  useAccounts,
  useActiveChains,
  useTransactionFns,
} from '@hyperlane-xyz/widgets';
import { PublicKey } from '@solana/web3.js';
import { useCallback, useState } from 'react';
import { toast } from 'react-toastify';
import { toastTxSuccess } from '../../components/toast/TxSuccessToast';
import { useCustomTransactionFns } from '../../custom/useCustomTransactionFns';
import { logger } from '../../utils/logger';
import { buildSolanaFeeInstruction } from './adminFee/build';
import { quoteAdminFee, AdminFeeQuote } from './adminFee/quote';
import { refinerIdentifyAndShowTransferForm } from '../analytics/refiner';
import { EVENT_NAME } from '../analytics/types';
import { trackEvent } from '../analytics/utils';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { AppState, useStore } from '../store';
import { getTokenByIndex, useWarpCore } from '../tokens/hooks';
import { TransferContext, TransferFormValues, TransferStatus } from './types';
import { tryGetMsgIdFromTransferReceipt } from './utils';

const CHAIN_MISMATCH_ERROR = 'ChainMismatchError';
const TRANSFER_TIMEOUT_ERROR1 = 'block height exceeded';
const TRANSFER_TIMEOUT_ERROR2 = 'timeout';

export function useTokenTransfer(onDone?: () => void) {
  const { transfers, addTransfer, updateTransferStatus } = useStore((s) => ({
    transfers: s.transfers,
    addTransfer: s.addTransfer,
    updateTransferStatus: s.updateTransferStatus,
  }));
  const transferIndex = transfers.length;

  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore();

  const activeAccounts = useAccounts(multiProvider);
  const activeChains = useActiveChains(multiProvider);
  // Custom fns: Cosmos (multi-message + fee) and EVM (EIP-5792 + fee)
  const transactionFns = useCustomTransactionFns(multiProvider);

  const [isLoading, setIsLoading] = useState(false);

  // TODO implement cancel callback for when modal is closed?
  const triggerTransactions = useCallback(
    (values: TransferFormValues) =>
      executeTransfer({
        warpCore,
        values,
        transferIndex,
        activeAccounts,
        activeChains,
        transactionFns,
        addTransfer,
        updateTransferStatus,
        setIsLoading,
        onDone,
      }),
    [
      warpCore,
      transferIndex,
      activeAccounts,
      activeChains,
      transactionFns,
      setIsLoading,
      addTransfer,
      updateTransferStatus,
      onDone,
    ],
  );

  return {
    isLoading,
    triggerTransactions,
  };
}

async function executeTransfer({
  warpCore,
  values,
  transferIndex,
  activeAccounts,
  activeChains,
  transactionFns,
  addTransfer,
  updateTransferStatus,
  setIsLoading,
  onDone,
}: {
  warpCore: WarpCore;
  values: TransferFormValues;
  transferIndex: number;
  activeAccounts: ReturnType<typeof useAccounts>;
  activeChains: ReturnType<typeof useActiveChains>;
  transactionFns: ReturnType<typeof useTransactionFns>;
  addTransfer: (t: TransferContext) => void;
  updateTransferStatus: AppState['updateTransferStatus'];
  setIsLoading: (b: boolean) => void;
  onDone?: () => void;
}) {
  logger.debug('Preparing transfer transaction(s)');
  setIsLoading(true);
  let transferStatus: TransferStatus = TransferStatus.Preparing;
  updateTransferStatus(transferIndex, transferStatus);

  const { origin, destination, tokenIndex, amount, recipient } = values;
  const multiProvider = warpCore.multiProvider;

  try {
    const originToken = getTokenByIndex(warpCore, tokenIndex);
    const connection = originToken?.getConnectionForChain(destination);
    if (!originToken || !connection) throw new Error('No token route found between chains');

    const originProtocol = originToken.protocol;
    const isNft = originToken.isNft();
    const weiAmountOrId = isNft ? amount : toWei(amount, originToken.decimals);
    const originTokenAmount = originToken.amount(weiAmountOrId);

    const sendTransaction = transactionFns[originProtocol].sendTransaction;
    const sendMultiTransaction = transactionFns[originProtocol].sendMultiTransaction;
    const activeChain = activeChains.chains[originProtocol];
    const sender = getAccountAddressForChain(multiProvider, origin, activeAccounts.accounts);
    if (!sender) throw new Error('No active account found for origin chain');

    // Administrative fee (keeps the UI running): quoted NOW with the live price of the
    // origin's native token. null = fee disabled on this chain (no wallet) or price unavailable
    // (in that case the transfer proceeds without the fee — we never block the user over a price hiccup).
    let feeQuote: AdminFeeQuote | null = null;
    try {
      feeQuote = await quoteAdminFee(origin);
      if (feeQuote)
        logger.debug(`[adminFee] ${feeQuote.feeUsd} USD = ${feeQuote.amountHuman} (${origin})`);
    } catch (e) {
      logger.warn('[adminFee] failed to quote fee — proceeding without fee', e);
    }

    const isCollateralSufficient = await warpCore.isDestinationCollateralSufficient({
      originTokenAmount,
      destination,
    });
    if (!isCollateralSufficient) {
      toast.error('Insufficient collateral on destination for transfer');
      throw new Error('Insufficient destination collateral');
    }

    addTransfer({
      timestamp: new Date().getTime(),
      status: TransferStatus.Preparing,
      origin,
      destination,
      originTokenAddressOrDenom: originToken.addressOrDenom,
      destTokenAddressOrDenom: connection.token.addressOrDenom,
      sender,
      recipient,
      amount,
    });

    updateTransferStatus(transferIndex, (transferStatus = TransferStatus.CreatingTxs));

    const txs = await warpCore.getTransferRemoteTxs({
      originTokenAmount,
      destination,
      sender,
      recipient,
    });

    const hashes: string[] = [];
    let txReceipt: TypedTransactionReceipt | undefined = undefined;

    if (txs.length > 1 && txs.every((tx) => tx.type === ProviderType.Starknet)) {
      updateTransferStatus(
        transferIndex,
        (transferStatus = txCategoryToStatuses[WarpTxCategory.Transfer][0]),
      );
      const { hash, confirm } = await sendMultiTransaction({
        txs,
        chainName: origin,
        activeChainName: activeChain.chainName,
      });
      updateTransferStatus(
        transferIndex,
        (transferStatus = txCategoryToStatuses[WarpTxCategory.Transfer][1]),
      );
      txReceipt = await confirm();
      const description = toTitleCase(WarpTxCategory.Transfer);
      logger.debug(`${description} transaction confirmed, hash:`, hash);
      toastTxSuccess(`${description} transaction sent!`, hash, origin);

      hashes.push(hash);
    } else {
      // For Cosmos, combine multiple approval transactions into a single multi-message transaction
      // Check whether it is Cosmos by checking the protocol or the transaction types
      const isCosmosProtocol =
        originProtocol === ProtocolType.Cosmos ||
        originProtocol === ProtocolType.CosmosNative ||
        (txs.length > 0 &&
          (txs[0].type === ProviderType.CosmJsWasm ||
            txs[0].type === ProviderType.CosmJsNative ||
            txs[0].type === ProviderType.CosmJs));

      if (isCosmosProtocol) {
        // Filter Approval and Transfer at once to combine them into a multi-message transaction
        const approvalAndTransferTxs = txs.filter(
          (tx) =>
            tx.category === WarpTxCategory.Approval ||
            tx.category === WarpTxCategory.Transfer,
        );

        // If there are Approval and/or Transfer txs, combine them into a single multi-message transaction
        if (approvalAndTransferTxs.length > 0) {
          logger.info(
            `Combining ${approvalAndTransferTxs.length} approval and transfer transactions into a single multi-message transaction for Cosmos`,
          );

          // Create a multi-message transaction combining all the messages
          // For CosmWasm, we need to create an array of messages
          const combinedMsgs: any[] = [];
          let combinedFunds: any[] = [];

          // Add the approval messages first
          approvalAndTransferTxs
            .filter((tx) => tx.category === WarpTxCategory.Approval)
            .forEach((tx) => {
              if (tx.transaction.msg) {
                combinedMsgs.push({
                  contractAddress: tx.transaction.contractAddress,
                  msg: tx.transaction.msg,
                  funds: tx.transaction.funds || [],
                });
              }
            });

          // Add the transfer messages after
          approvalAndTransferTxs
            .filter((tx) => tx.category === WarpTxCategory.Transfer)
            .forEach((tx) => {
              if (tx.transaction.msg) {
                combinedMsgs.push({
                  contractAddress: tx.transaction.contractAddress,
                  msg: tx.transaction.msg,
                  funds: tx.transaction.funds || [],
                });
                // Combine the transfer's funds (contains the fees)
                if (tx.transaction.funds && tx.transaction.funds.length > 0) {
                  combinedFunds = [...combinedFunds, ...tx.transaction.funds];
                }
              }
            });

          // Remove duplicate funds (same denom)
          const uniqueFunds = combinedFunds.reduce((acc: any[], fund: any) => {
            const existing = acc.find((f) => f.denom === fund.denom);
            if (existing) {
              existing.amount = (
                BigInt(existing.amount) + BigInt(fund.amount)
              ).toString();
            } else {
              acc.push({ ...fund });
            }
            return acc;
          }, []);

          // Create the combined transaction using the first transaction as a base
          // Pass the array of messages directly as the transaction
          // The custom useCustomCosmosTransactionFns function detects arrays and calls executeMultiple directly
          const baseTx = approvalAndTransferTxs[0];
          const combinedTx = {
            ...baseTx,
            category: WarpTxCategory.Transfer,
            // Pass the array of messages directly
            // Structure: [{contractAddress, msg, funds}, {contractAddress, msg, funds}]
            transaction: combinedMsgs as any,
            // Administrative fee: the custom cosmos fn adds a MsgSend in the SAME tx (1 signature)
            adminFee: feeQuote || undefined,
          } as any;

          logger.debug(
            `[useTokenTransfer] Combined ${combinedMsgs.length} messages into single transaction`,
            { combinedMsgs, uniqueFunds },
          );

          updateTransferStatus(
            transferIndex,
            (transferStatus = txCategoryToStatuses[WarpTxCategory.Transfer][0]),
          );
          const { hash, confirm } = await sendTransaction({
            tx: combinedTx,
            chainName: origin,
            activeChainName: activeChain.chainName,
          });
          updateTransferStatus(
            transferIndex,
            (transferStatus = txCategoryToStatuses[WarpTxCategory.Transfer][1]),
          );
          txReceipt = await confirm();
          const description = toTitleCase(WarpTxCategory.Transfer);
          logger.debug(`${description} transaction confirmed, hash:`, hash);
          toastTxSuccess(`${description} transaction sent!`, hash, origin);

          hashes.push(hash);
        } else {
          // If there is only one approval or none, send normally
          for (const tx of txs) {
            updateTransferStatus(
              transferIndex,
              (transferStatus = txCategoryToStatuses[tx.category][0]),
            );
            const { hash, confirm } = await sendTransaction({
              tx,
              chainName: origin,
              activeChainName: activeChain.chainName,
            });
            updateTransferStatus(
              transferIndex,
              (transferStatus = txCategoryToStatuses[tx.category][1]),
            );
            txReceipt = await confirm();
            const description = toTitleCase(tx.category);
            logger.debug(`${description} transaction confirmed, hash:`, hash);
            toastTxSuccess(`${description} transaction sent!`, hash, origin);

            hashes.push(hash);
          }
        }
      } else {
        // For other protocols (EVM and Solana), send normally
        for (const tx of txs) {
          // Administrative fee: attach/inject ONLY into the TRANSFER transaction
          // (never into the ERC20 approval). The approval proceeds without the fee.
          if (feeQuote && tx.category === WarpTxCategory.Transfer) {
            if (originProtocol === ProtocolType.Ethereum) {
              // EVM: the custom fn (sendWithFee) reads this and does the EIP-5792 batch (1 approval)
              (tx as any).adminFee = feeQuote;
            } else if (originProtocol === ProtocolType.Sealevel) {
              // Solana: injects the fee instruction into the SAME Transaction (1 signature)
              try {
                const solTx: any = tx.transaction;
                if (solTx && typeof solTx.add === 'function') {
                  solTx.add(buildSolanaFeeInstruction(new PublicKey(sender), feeQuote));
                  logger.debug(`[adminFee][solana] fee ${feeQuote.amountHuman} injected into the tx`);
                } else {
                  logger.warn('[adminFee][solana] non-legacy Transaction — fee skipped for this tx');
                }
              } catch (e) {
                logger.warn('[adminFee][solana] failed to inject fee — proceeding without fee', e);
              }
            }
          }
          updateTransferStatus(
            transferIndex,
            (transferStatus = txCategoryToStatuses[tx.category][0]),
          );
          const { hash, confirm } = await sendTransaction({
            tx,
            chainName: origin,
            activeChainName: activeChain.chainName,
          });
          updateTransferStatus(
            transferIndex,
            (transferStatus = txCategoryToStatuses[tx.category][1]),
          );
          txReceipt = await confirm();
          const description = toTitleCase(tx.category);
          logger.debug(`${description} transaction confirmed, hash:`, hash);
          toastTxSuccess(`${description} transaction sent!`, hash, origin);

          hashes.push(hash);
        }
      }
    }

    const msgId = txReceipt
      ? tryGetMsgIdFromTransferReceipt(multiProvider, origin, txReceipt)
      : undefined;

    const originTxHash = hashes.at(-1);
    updateTransferStatus(transferIndex, (transferStatus = TransferStatus.ConfirmedTransfer), {
      originTxHash,
      msgId,
    });

    // track event after tx submission
    const originChainId = warpCore.multiProvider.getChainId(origin);
    const destinationChainId = warpCore.multiProvider.getChainId(destination);
    trackEvent(EVENT_NAME.TRANSACTION_SUBMITTED, {
      amount,
      recipient,
      chains: `${origin}|${originChainId}|${destination}|${destinationChainId}`,
      tokenAddress: originToken.addressOrDenom,
      tokenSymbol: originToken.symbol,
      walletAddress: sender,
      transactionHash: originTxHash || '',
    });

    // Identify user and show Refiner survey form after successful transfer
    refinerIdentifyAndShowTransferForm({
      walletAddress: sender,
      protocol: originProtocol,
      chain: origin,
    });
  } catch (error: any) {
    logger.error(`Error at stage ${transferStatus}`, error);
    const errorDetails = error.message || error.toString();
    updateTransferStatus(transferIndex, TransferStatus.Failed);
    if (errorDetails.includes(CHAIN_MISMATCH_ERROR)) {
      // Wagmi switchNetwork call helps prevent this but isn't foolproof
      toast.error('Wallet must be connected to origin chain');
    } else if (
      errorDetails.includes(TRANSFER_TIMEOUT_ERROR1) ||
      errorDetails.includes(TRANSFER_TIMEOUT_ERROR2)
    ) {
      toast.error(
        `Transaction timed out, ${getChainDisplayName(multiProvider, origin)} may be busy. Please try again.`,
      );
    } else {
      toast.error(errorMessages[transferStatus] || 'Unable to transfer tokens.');
    }
  }

  setIsLoading(false);
  if (onDone) onDone();
}

const errorMessages: Partial<Record<TransferStatus, string>> = {
  [TransferStatus.Preparing]: 'Error while preparing the transactions.',
  [TransferStatus.CreatingTxs]: 'Error while creating the transactions.',
  [TransferStatus.SigningApprove]: 'Error while signing the approve transaction.',
  [TransferStatus.ConfirmingApprove]: 'Error while confirming the approve transaction.',
  [TransferStatus.SigningTransfer]: 'Error while signing the transfer transaction.',
  [TransferStatus.ConfirmingTransfer]: 'Error while confirming the transfer transaction.',
};

const txCategoryToStatuses: Record<WarpTxCategory, [TransferStatus, TransferStatus]> = {
  [WarpTxCategory.Approval]: [TransferStatus.SigningApprove, TransferStatus.ConfirmingApprove],
  [WarpTxCategory.Revoke]: [TransferStatus.SigningRevoke, TransferStatus.ConfirmingRevoke],
  [WarpTxCategory.Transfer]: [TransferStatus.SigningTransfer, TransferStatus.ConfirmingTransfer],
};
