/**
 * Composes the custom transaction fns: Cosmos (multi-message + fee), EVM
 * (EIP-5792 + fee) and Solana (Phantom-first signing order required by
 * Lighthouse; the fee is injected into the Transaction by useTokenTransfer
 * before any signature). Everything else keeps the original implementation.
 */
import { ProtocolType } from '@hyperlane-xyz/utils';
import type { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { useCustomCosmosTransactionFns } from './useCustomCosmosTransactionFns';
import { useCustomEvmTransactionFns } from './useCustomEvmTransactionFns';
import { useCustomSolanaTransactionFns } from './useCustomSolanaTransactionFns';

export function useCustomTransactionFns(multiProvider: MultiProtocolProvider) {
  const cosmosFns = useCustomCosmosTransactionFns(multiProvider); // full map w/ Cosmos overridden
  const evmFns = useCustomEvmTransactionFns(multiProvider); // full map w/ EVM overridden
  const solanaFns = useCustomSolanaTransactionFns(multiProvider); // Phantom signs first (Lighthouse)

  return {
    ...cosmosFns,
    [ProtocolType.Ethereum]: evmFns[ProtocolType.Ethereum],
    [ProtocolType.Sealevel]: solanaFns,
  };
}
