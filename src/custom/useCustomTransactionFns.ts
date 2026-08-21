/**
 * Compõe as transaction fns customizadas: Cosmos (multi-message + taxa) e EVM
 * (EIP-5792 + taxa). Solana é tratado inline no useTokenTransfer (injeção de
 * instrução no Transaction). Tudo o mais permanece a implementação original.
 */
import { ProtocolType } from '@hyperlane-xyz/utils';
import type { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { useCustomCosmosTransactionFns } from './useCustomCosmosTransactionFns';
import { useCustomEvmTransactionFns } from './useCustomEvmTransactionFns';

export function useCustomTransactionFns(multiProvider: MultiProtocolProvider) {
  const cosmosFns = useCustomCosmosTransactionFns(multiProvider); // mapa completo c/ Cosmos sobrescrito
  const evmFns = useCustomEvmTransactionFns(multiProvider); // mapa completo c/ EVM sobrescrito

  return {
    ...cosmosFns,
    [ProtocolType.Ethereum]: evmFns[ProtocolType.Ethereum],
  };
}
