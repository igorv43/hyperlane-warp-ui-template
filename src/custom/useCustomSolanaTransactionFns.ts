/**
 * Custom Solana transaction fns — Phantom Lighthouse compatibility.
 *
 * Difference from useSolanaTransactionFns in @hyperlane-xyz/widgets:
 * SIGNING ORDER required by Phantom — the wallet signs FIRST
 * (signTransaction) and the additional signers (the warp randomWallet,
 * attached by CustomSealevelTokenAdapter in __additionalSigners) sign
 * AFTERWARD via partialSign. The original wallet-adapter flow signed the
 * extra signer before the wallet, which made Lighthouse flag the transaction
 * as suspicious.
 */
import {
  ProviderType,
  type MultiProtocolProvider,
  type TypedTransactionReceipt,
} from '@hyperlane-xyz/sdk';
import { useSolanaSwitchNetwork } from '@hyperlane-xyz/widgets';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, Transaction } from '@solana/web3.js';
import { useCallback } from 'react';
import { logger } from '../utils/logger';
import { getAdditionalSigners } from './adapters/CustomSealevelTokenAdapter';

export function useCustomSolanaTransactionFns(multiProvider: MultiProtocolProvider) {
  const { sendTransaction: sendSolTransaction, signTransaction } = useWallet();
  const { switchNetwork } = useSolanaSwitchNetwork();

  const onSendTx = useCallback(
    async ({
      tx,
      chainName,
      activeChainName,
    }: {
      tx: any;
      chainName: string;
      activeChainName?: string;
    }) => {
      if (tx.type !== ProviderType.SolanaWeb3)
        throw new Error(`Unsupported tx type: ${tx.type}`);
      if (activeChainName && activeChainName !== chainName) await switchNetwork(chainName);

      const rpcUrl = multiProvider.getRpcUrl(chainName);
      const connection = new Connection(rpcUrl, 'confirmed');
      const legacyTx = tx.transaction as Transaction;
      const additionalSigners = getAdditionalSigners(legacyTx);

      const {
        context: { slot: minContextSlot },
        value: { blockhash, lastValidBlockHeight },
      } = await connection.getLatestBlockhashAndContext();

      logger.debug(`Sending tx on chain ${chainName}`);
      let signature: string;

      if (signTransaction) {
        // Fresh blockhash BEFORE any signature
        legacyTx.recentBlockhash = blockhash;
        // 1st the wallet (Phantom), 2nd the additional signers
        const signed = (await signTransaction(legacyTx as any)) as Transaction;
        if (additionalSigners.length) signed.partialSign(...additionalSigners);
        signature = await connection.sendRawTransaction(signed.serialize(), {
          minContextSlot,
        });
      } else {
        // Wallet without signTransaction: fall back to the wallet-adapter flow
        signature = await sendSolTransaction(legacyTx, connection, {
          minContextSlot,
          signers: additionalSigners.length ? additionalSigners : undefined,
        });
      }

      const confirm = (): Promise<TypedTransactionReceipt> =>
        connection
          .confirmTransaction({ blockhash, lastValidBlockHeight, signature })
          .then(() => connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 }))
          .then(
            (r) =>
              ({
                type: ProviderType.SolanaWeb3,
                receipt: r,
              }) as TypedTransactionReceipt,
          );

      return { hash: signature, confirm };
    },
    [switchNetwork, sendSolTransaction, signTransaction, multiProvider],
  );

  const onMultiSendTx = useCallback(async () => {
    throw new Error('Multi Transactions not supported on Solana');
  }, []);

  return {
    sendTransaction: onSendTx,
    sendMultiTransaction: onMultiSendTx,
    switchNetwork,
  };
}
