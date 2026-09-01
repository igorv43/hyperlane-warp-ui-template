/**
 * Custom transaction fns for EVM (BSC/Ethereum) that charge the administrative FEE
 * TOGETHER with transferRemote in ONE approval, via EIP-5792 (wallet_sendCalls).
 *
 * If the wallet supports EIP-5792 (MetaMask, Rabby, Coinbase...): warp + fee go
 * in a single atomic batch = 1 popup. If it does NOT: automatic fallback to 2 txs
 * (warp first — the user is never charged without receiving the transfer; fee after).
 *
 * The fee comes attached in (tx as any).adminFee by useTokenTransfer. Without a fee,
 * it delegates 100% to the widget's original implementation (behavior intact).
 */
import { ProviderType, WarpTypedTransaction } from '@hyperlane-xyz/sdk';
import { ProtocolType, assert } from '@hyperlane-xyz/utils';
import { useTransactionFns } from '@hyperlane-xyz/widgets';
import type { MultiProtocolProvider, ChainName } from '@hyperlane-xyz/sdk';
import { getAccount, sendTransaction } from '@wagmi/core';
import { sendCalls, waitForCallsStatus } from '@wagmi/core/experimental';
import { useCallback } from 'react';
import { useConfig } from 'wagmi';
import { buildEvmFeeCall } from '../features/transfer/adminFee/build';
import type { AdminFeeQuote } from '../features/transfer/adminFee/quote';
import { logger } from '../utils/logger';

function toBig(v: any): bigint {
  if (v === undefined || v === null || v === '') return 0n;
  try {
    return BigInt(typeof v === 'object' && v.toString ? v.toString() : v);
  } catch {
    return 0n;
  }
}

export function useCustomEvmTransactionFns(multiProvider: MultiProtocolProvider) {
  const config = useConfig();
  const original = useTransactionFns(multiProvider);
  const evmOriginal = original[ProtocolType.Ethereum];

  const sendWithFee = useCallback(
    async ({
      tx,
      chainName,
      activeChainName,
    }: {
      tx: WarpTypedTransaction;
      chainName: ChainName;
      activeChainName?: ChainName;
    }) => {
      const feeQuote = (tx as any).adminFee as AdminFeeQuote | undefined;

      // No fee (or unexpected type) → original behavior, touching nothing.
      if (!feeQuote || tx.type !== ProviderType.EthersV5) {
        return evmOriginal.sendTransaction({ tx, chainName, activeChainName });
      }

      // Ensure the correct chain (the original fn does the switch; we reuse it for that).
      if (activeChainName && activeChainName !== chainName) {
        await evmOriginal.switchNetwork?.(chainName);
      }
      const chainId = multiProvider.getChainMetadata(chainName).chainId as number;
      const acct = await getAccount(config);
      assert(acct?.chain?.id === chainId, `Wallet not on chain ${chainName} (ChainMismatchError)`);

      const warp: any = tx.transaction;
      const warpCall = {
        to: warp.to as `0x${string}`,
        data: (warp.data ?? '0x') as `0x${string}`,
        value: toBig(warp.value),
      };
      const feeCall = buildEvmFeeCall(feeQuote); // {to, value}

      // Preferred path: 1 atomic approval (EIP-5792). warp first in the batch.
      try {
        const res: any = await sendCalls(config, {
          chainId,
          calls: [warpCall, feeCall],
        } as any);
        const id = typeof res === 'string' ? res : res?.id;
        assert(id, 'sendCalls did not return an id');

        const status: any = await waitForCallsStatus(config, { id });
        const receipts: any[] = status?.receipts || [];
        // receipts follow the order of the calls → [0] = warp. We keep it to extract the msgId.
        const warpReceipt = receipts[0] || {};
        const hash = warpReceipt.transactionHash || id;
        logger.debug('[adminFee][evm] EIP-5792 ok — warp+fee in 1 approval', { id, hash });

        const confirm = async () => ({
          type: ProviderType.Viem,
          receipt: { ...warpReceipt, contractAddress: warpReceipt.contractAddress || null },
        });
        return { hash, confirm };
      } catch (e: any) {
        // Fallback: wallet without EIP-5792 → 2 txs. Warp FIRST (never charge without delivering).
        logger.warn('[adminFee][evm] EIP-5792 unavailable — fallback to 2 txs:', e?.message || e);
        const warpResult = await evmOriginal.sendTransaction({ tx, chainName, activeChainName });
        try {
          await sendTransaction(config, { chainId, to: feeCall.to, value: feeCall.value });
          logger.debug('[adminFee][evm] fee sent (fallback, 2nd tx)');
        } catch (fe: any) {
          // Does not undo the already-sent warp; just logs it. The user received the transfer.
          logger.error('[adminFee][evm] fee (fallback) failed:', fe?.message || fe);
        }
        return warpResult;
      }
    },
    [config, evmOriginal, multiProvider],
  );

  const customFns = { ...original };
  if (customFns[ProtocolType.Ethereum]) {
    customFns[ProtocolType.Ethereum] = {
      ...customFns[ProtocolType.Ethereum],
      sendTransaction: sendWithFee as any,
    };
  }
  return customFns;
}
