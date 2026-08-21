/**
 * Custom transaction fns para EVM (BSC/Ethereum) que cobram a TAXA administrativa
 * JUNTO do transferRemote com UMA aprovação, via EIP-5792 (wallet_sendCalls).
 *
 * Se a carteira suportar EIP-5792 (MetaMask, Rabby, Coinbase...): warp + taxa vão
 * num único batch atômico = 1 popup. Se NÃO suportar: fallback automático para 2 txs
 * (warp primeiro — o usuário nunca é cobrado sem receber a transferência; taxa depois).
 *
 * A taxa vem anexada em (tx as any).adminFee pelo useTokenTransfer. Sem taxa, delega
 * 100% para a implementação original do widget (comportamento intacto).
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

      // Sem taxa (ou tipo inesperado) → comportamento original, sem tocar em nada.
      if (!feeQuote || tx.type !== ProviderType.EthersV5) {
        return evmOriginal.sendTransaction({ tx, chainName, activeChainName });
      }

      // Garantir a chain certa (a fn original faz switch; reusamos para isso).
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

      // Caminho preferido: 1 aprovação atômica (EIP-5792). warp primeiro no batch.
      try {
        const res: any = await sendCalls(config, {
          chainId,
          calls: [warpCall, feeCall],
        } as any);
        const id = typeof res === 'string' ? res : res?.id;
        assert(id, 'sendCalls não retornou id');

        const status: any = await waitForCallsStatus(config, { id });
        const receipts: any[] = status?.receipts || [];
        // receipts seguem a ordem das calls → [0] = warp. Guardamos p/ extrair o msgId.
        const warpReceipt = receipts[0] || {};
        const hash = warpReceipt.transactionHash || id;
        logger.debug('[adminFee][evm] EIP-5792 ok — warp+taxa em 1 aprovação', { id, hash });

        const confirm = async () => ({
          type: ProviderType.Viem,
          receipt: { ...warpReceipt, contractAddress: warpReceipt.contractAddress || null },
        });
        return { hash, confirm };
      } catch (e: any) {
        // Fallback: carteira sem EIP-5792 → 2 txs. Warp PRIMEIRO (nunca cobra sem entregar).
        logger.warn('[adminFee][evm] EIP-5792 indisponível — fallback 2 txs:', e?.message || e);
        const warpResult = await evmOriginal.sendTransaction({ tx, chainName, activeChainName });
        try {
          await sendTransaction(config, { chainId, to: feeCall.to, value: feeCall.value });
          logger.debug('[adminFee][evm] taxa enviada (fallback, 2ª tx)');
        } catch (fe: any) {
          // Não desfaz o warp já enviado; apenas registra. O usuário recebeu a transferência.
          logger.error('[adminFee][evm] taxa (fallback) falhou:', fe?.message || fe);
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
