/**
 * Construtores do pagamento da taxa por protocolo. Cada um devolve algo que será
 * ANEXADO à MESMA transação do envio (uma só aprovação):
 *  - Cosmos: um MsgSend (bank) para entrar no signAndBroadcast junto do warp
 *  - Solana: uma instrução SystemProgram.transfer para somar ao Transaction do warp
 *  - EVM:    um {to, value} para o batch EIP-5792 (ou tx separada no fallback)
 */
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import type { AdminFeeQuote } from './quote';

/** EncodeObject do MsgSend nativo (cosmjs registra este typeUrl por padrão). */
export function buildCosmosFeeMsg(sender: string, quote: AdminFeeQuote) {
  return {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: sender,
      toAddress: quote.chain.recipient,
      amount: [{ denom: quote.chain.nativeDenom || 'uluna', amount: quote.amountBaseUnits }],
    },
  };
}

/** Instrução de transferência de SOL (lamports) para a carteira da taxa. */
export function buildSolanaFeeInstruction(
  sender: PublicKey,
  quote: AdminFeeQuote,
): TransactionInstruction {
  return SystemProgram.transfer({
    fromPubkey: sender,
    toPubkey: new PublicKey(quote.chain.recipient),
    lamports: BigInt(quote.amountBaseUnits),
  });
}

/** Call nativo EVM: envia `value` (wei) para a carteira da taxa, sem calldata. */
export function buildEvmFeeCall(quote: AdminFeeQuote): { to: `0x${string}`; value: bigint } {
  return {
    to: quote.chain.recipient as `0x${string}`,
    value: BigInt(quote.amountBaseUnits),
  };
}
