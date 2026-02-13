/**
 * Custom transaction functions para Cosmos que suporta múltiplas mensagens
 * 
 * Este arquivo contém uma função customizada que estende useTransactionFns
 * do widget @hyperlane-xyz/widgets para suportar transações multi-message
 * no Cosmos sem modificar o pacote nativo.
 * 
 * Similar ao padrão usado em CustomCosmWasmTokenAdapter.ts onde sobrescrevemos
 * apenas o método necessário (populateApproveTx, populateTransferRemoteTx)
 * 
 * Aqui sobrescrevemos apenas o método sendTransaction para aceitar arrays de mensagens
 */

import { ChainName, ProviderType, WarpTypedTransaction } from '@hyperlane-xyz/sdk';
import { ProtocolType, assert } from '@hyperlane-xyz/utils';
import { cosmoshub } from '@hyperlane-xyz/registry';
import { useChains } from '@cosmos-kit/react';
import { useTransactionFns, useCosmosTransactionFns, getChainsForProtocol } from '@hyperlane-xyz/widgets';
import type { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { useMemo, useCallback } from 'react';
import { logger } from '../utils/logger';

/**
 * Função helper para obter nomes das chains do Cosmos
 * Similar à função interna getCosmosChainNames do widget
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
 * Hook customizado que estende useTransactionFns para suportar múltiplas mensagens no Cosmos
 * 
 * Sobrescreve apenas o método sendTransaction para detectar quando tx.transaction
 * é um array e chamar executeMultiple diretamente com o array de mensagens.
 * 
 * Similar ao CustomCosmWasmTokenAdapter que sobrescreve apenas populateApproveTx
 */
export function useCustomCosmosTransactionFns(multiProvider: MultiProtocolProvider) {
  const cosmosChains = useMemo(() => getCosmosChainNames(multiProvider), [multiProvider]);
  const chainToContext = useChains(cosmosChains);
  
  // Usar o hook original do widget para todos os protocolos
  const originalTransactionFns = useTransactionFns(multiProvider);
  
  // Usar o hook específico do Cosmos para obter a implementação base
  const cosmosFns = useCosmosTransactionFns(multiProvider);

  /**
   * Método customizado de sendTransaction que suporta arrays de mensagens
   * 
   * Sobrescreve apenas o comportamento para CosmJsWasm quando tx.transaction é um array
   * Similar a como CustomCosmWasmTokenAdapter sobrescreve populateApproveTx
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
      // Se não for CosmJsWasm ou se transaction não for um array, usar função original
      if (tx.type !== ProviderType.CosmJsWasm || !Array.isArray(tx.transaction)) {
        return cosmosFns.sendTransaction({ tx, chainName, activeChainName });
      }

      // Para CosmJsWasm com transaction como array, executar diretamente
      // Esta é a única modificação: aceitar arrays de mensagens
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

      // Passar o array de mensagens diretamente para executeMultiple
      // Esta é a mudança: não envolver em [] porque já é um array
      const executionResult = await client.executeMultiple(
        chainContext.address,
        tx.transaction, // Array de mensagens diretamente
        'auto',
      );

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

  // Retornar a mesma estrutura que useTransactionFns (indexada por ProtocolType)
  // Mas substituir apenas sendTransaction para protocolos Cosmos
  const customFns = { ...originalTransactionFns };

  // Substituir sendTransaction para protocolos Cosmos
  if (customFns[ProtocolType.Cosmos]) {
    customFns[ProtocolType.Cosmos] = {
      ...customFns[ProtocolType.Cosmos],
      sendTransaction: customSendTransaction, // Sobrescreve apenas este método
    };
  }

  if (customFns[ProtocolType.CosmosNative]) {
    customFns[ProtocolType.CosmosNative] = {
      ...customFns[ProtocolType.CosmosNative],
      sendTransaction: customSendTransaction, // Sobrescreve apenas este método
    };
  }

  return customFns;
}
