/**
 * Fee-payment builders per protocol. Each one returns something that will be
 * ATTACHED to the SAME send transaction (a single approval):
 *  - Cosmos: a MsgSend (bank) to go into signAndBroadcast alongside the warp
 *  - Solana: a SystemProgram.transfer instruction to add to the warp's Transaction
 *  - EVM:    a {to, value} for the EIP-5792 batch (or a separate tx in the fallback)
 */
import { PublicKey, SystemProgram, TransactionInstruction } from '@solana/web3.js';
import type { AdminFeeQuote } from './quote';

/** EncodeObject of the native MsgSend (cosmjs registers this typeUrl by default). */
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

/** SOL (lamports) transfer instruction to the fee wallet. */
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

/** Native EVM call: sends `value` (wei) to the fee wallet, with no calldata. */
export function buildEvmFeeCall(quote: AdminFeeQuote): { to: `0x${string}`; value: bigint } {
  return {
    to: quote.chain.recipient as `0x${string}`,
    value: BigInt(quote.amountBaseUnits),
  };
}
