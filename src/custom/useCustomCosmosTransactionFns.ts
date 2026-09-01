/**
 * Custom transaction functions for Cosmos that support multiple messages
 *
 * This file contains a custom function that extends useTransactionFns
 * from the @hyperlane-xyz/widgets widget to support multi-message
 * transactions on Cosmos without modifying the native package.
 *
 * Similar to the pattern used in CustomCosmWasmTokenAdapter.ts where we override
 * only the necessary method (populateApproveTx, populateTransferRemoteTx)
 *
 * Here we override only the sendTransaction method to accept arrays of messages
 */

import { ChainName, ProviderType, WarpTypedTransaction } from '@hyperlane-xyz/sdk';
import { ProtocolType, assert } from '@hyperlane-xyz/utils';
import { cosmoshub } from '@hyperlane-xyz/registry';
import { useChains } from '@cosmos-kit/react';
import { useTransactionFns, useCosmosTransactionFns, getChainsForProtocol } from '@hyperlane-xyz/widgets';
import type { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { useMemo, useCallback } from 'react';
import { TX_MEMO } from '../consts/txMemo';
import { buildCosmosFeeMsg } from '../features/transfer/adminFee/build';
import type { AdminFeeQuote } from '../features/transfer/adminFee/quote';
import { logger } from '../utils/logger';

/**
 * Helper function to get the names of the Cosmos chains
 * Similar to the widget's internal getCosmosChainNames function
 */
function getCosmosChainNames(multiProvider: MultiProtocolProvider): string[] {
  const cosmosChains = [
    ...getChainsForProtocol(multiProvider, ProtocolType.Cosmos),
    ...getChainsForProtocol(multiProvider, ProtocolType.CosmosNative),
    cosmoshub,
  ];
  return cosmosChains.map((c) => c.name);
}

/**
 * Custom hook that extends useTransactionFns to support multiple messages on Cosmos
 *
 * Overrides only the sendTransaction method to detect when tx.transaction
 * is an array and call executeMultiple directly with the array of messages.
 *
 * Similar to CustomCosmWasmTokenAdapter, which overrides only populateApproveTx
 */
export function useCustomCosmosTransactionFns(multiProvider: MultiProtocolProvider) {
  const cosmosChains = useMemo(() => getCosmosChainNames(multiProvider), [multiProvider]);
  const chainToContext = useChains(cosmosChains);
  
  // Use the widget's original hook for all protocols
  const originalTransactionFns = useTransactionFns(multiProvider);
  
  // Use the Cosmos-specific hook to get the base implementation
  const cosmosFns = useCosmosTransactionFns(multiProvider);

  /**
   * Custom sendTransaction method that supports arrays of messages
   *
   * Overrides only the behavior for CosmJsWasm when tx.transaction is an array
   * Similar to how CustomCosmWasmTokenAdapter overrides populateApproveTx
   */
  const customSendTransaction = useCallback(
    async ({
      tx,
      chainName,
      activeChainName,
    }: {
      tx: WarpTypedTransaction;
      chainName: ChainName;
      activeChainName?: ChainName;
    }) => {
      // If it is not CosmJsWasm or transaction is not an array, use the original function
      if (tx.type !== ProviderType.CosmJsWasm || !Array.isArray(tx.transaction)) {
        return cosmosFns.sendTransaction({ tx, chainName, activeChainName });
      }

      // For CosmJsWasm with transaction as an array, execute directly
      // This is the only modification: accepting arrays of messages
      const chainContext = chainToContext[chainName];
      if (!chainContext?.address) {
        throw new Error(`Cosmos wallet not connected for ${chainName}`);
      }

      logger.debug(
        `[useCustomCosmosTransactionFns] Executing ${tx.transaction.length} messages in single transaction`,
        { chainName, messages: tx.transaction },
      );

      const { getSigningCosmWasmClient } = chainContext;
      const client = await getSigningCosmWasmClient();
      const senderAddr = chainContext.address;

      // Administrative fee attached by useTokenTransfer? Then we need to mix
      // a MsgSend (bank) with the warp's MsgExecuteContract — and executeMultiple does NOT
      // accept bank sends. We switch to signAndBroadcast with ENCODED messages,
      // all in a single signature (one approval).
      const feeQuote = (tx as any).adminFee as AdminFeeQuote | undefined;

      let executionResult;
      if (feeQuote) {
        const encoded: any[] = (tx.transaction as any[]).map((m) => ({
          typeUrl: '/cosmwasm.wasm.v1.MsgExecuteContract',
          value: {
            sender: senderAddr,
            contract: m.contractAddress,
            msg: new TextEncoder().encode(typeof m.msg === 'string' ? m.msg : JSON.stringify(m.msg)),
            funds: m.funds || [],
          },
        }));
        encoded.push(buildCosmosFeeMsg(senderAddr, feeQuote));
        logger.debug(
          `[useCustomCosmosTransactionFns] +administrative fee (${feeQuote.amountHuman}) via signAndBroadcast — ${encoded.length} msgs, 1 signature`,
        );
        executionResult = await client.signAndBroadcast(senderAddr, encoded, 'auto', TX_MEMO);
      } else {
        // No fee: original path (executeMultiple with the array of messages).
        executionResult = await client.executeMultiple(senderAddr, tx.transaction, 'auto', TX_MEMO);
      }

      const txDetails = await client.getTx(executionResult.transactionHash);
      assert(txDetails, `Cosmos tx failed: ${JSON.stringify(txDetails)}`);

      const receipt = {
        ...txDetails,
        transactionHash: executionResult.transactionHash,
      };

      const confirm = async () => {
        assert(
          receipt && receipt.code === 0,
          `Cosmos tx failed: ${JSON.stringify(receipt)}`,
        );
        return {
          type: tx.type,
          receipt,
        };
      };

      return {
        hash: receipt.transactionHash,
        confirm,
      };
    },
    [chainToContext, cosmosFns],
  );

  // Return the same structure as useTransactionFns (indexed by ProtocolType)
  // But replace only sendTransaction for Cosmos protocols
  const customFns = { ...originalTransactionFns };

  // Replace sendTransaction for Cosmos protocols
  if (customFns[ProtocolType.Cosmos]) {
    customFns[ProtocolType.Cosmos] = {
      ...customFns[ProtocolType.Cosmos],
      sendTransaction: customSendTransaction, // Overrides only this method
    };
  }

  if (customFns[ProtocolType.CosmosNative]) {
    customFns[ProtocolType.CosmosNative] = {
      ...customFns[ProtocolType.CosmosNative],
      sendTransaction: customSendTransaction, // Overrides only this method
    };
  }

  return customFns;
}
