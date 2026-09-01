/* eslint-disable camelcase -- snake_case fields are mandated by the SDK's borsh schema */
/**
 * Custom Sealevel adapters — Phantom Lighthouse compatibility.
 *
 * The SDK signs the transaction with the extra signer (randomWallet, required
 * by the warp program for the message account) DURING build time
 * (populateTransferRemoteTx → tx.partialSign). Phantom's security system
 * (Lighthouse) requires the opposite order: the wallet signs FIRST and any
 * additional signers sign AFTERWARD.
 *
 * These adapters build exactly the same transaction as the SDK, but instead
 * of signing with the randomWallet they attach the keypair to
 * `tx.__additionalSigners` so useCustomSolanaTransactionFns can sign after
 * the wallet. This also allows the administration-fee instruction to be
 * injected before any signature exists (previously the injection invalidated
 * the randomWallet signature).
 */
import {
  SealevelHypCollateralAdapter,
  SealevelHypNativeAdapter,
  SealevelHypSyntheticAdapter,
  SealevelHypTokenAdapter,
  SealevelHypTokenInstruction,
  SealevelInstructionWrapper,
  SealevelTransferRemoteInstruction,
  SealevelTransferRemoteSchema,
} from '@hyperlane-xyz/sdk';
import { addressToBytes, padBytesToLength } from '@hyperlane-xyz/utils';
import {
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  Signer,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { serialize } from 'borsh';

// Same default as the SDK; tunable to leave CU headroom for Lighthouse guard
// instructions (Solana per-transaction limit = 1.4M CU).
const SOLANA_CU_LIMIT = parseInt(process.env.NEXT_PUBLIC_SOLANA_CU_LIMIT || '1000000', 10);

/** Property attached to the Transaction with the signers that sign AFTER the wallet */
export const ADDITIONAL_SIGNERS_KEY = '__additionalSigners';

export function getAdditionalSigners(tx: Transaction): Signer[] {
  return ((tx as any)[ADDITIONAL_SIGNERS_KEY] as Signer[] | undefined) ?? [];
}

type TransferRemoteParams = Parameters<
  SealevelHypSyntheticAdapter['populateTransferRemoteTx']
>[0];

/**
 * Replica of SealevelHypTokenAdapter.populateTransferRemoteTx (SDK), without
 * the tx.partialSign(randomWallet) — the keypair goes into __additionalSigners.
 */
async function buildUnsignedTransferRemoteTx(
  adapter: SealevelHypTokenAdapter,
  { weiAmountOrId, destination, recipient, fromAccountOwner }: TransferRemoteParams,
): Promise<Transaction> {
  if (!fromAccountOwner) throw new Error('fromAccountOwner required for Sealevel');
  const a = adapter as any; // access protected SDK helpers
  const randomWallet = Keypair.generate();
  const fromWalletPubKey = new PublicKey(fromAccountOwner);
  const mailboxPubKey = new PublicKey(a.addresses.mailbox);
  const keys = await a.getTransferInstructionKeyList({
    sender: fromWalletPubKey,
    mailbox: mailboxPubKey,
    randomWallet: randomWallet.publicKey,
    igp: await a.getIgpKeys(),
  });
  const value = new SealevelInstructionWrapper({
    instruction: SealevelHypTokenInstruction.TransferRemote,
    data: new SealevelTransferRemoteInstruction({
      destination_domain: destination,
      recipient: padBytesToLength(addressToBytes(recipient), 32),
      amount_or_id: BigInt(weiAmountOrId),
    }),
  });
  const serializedData = serialize(SealevelTransferRemoteSchema, value);
  const transferRemoteInstruction = new TransactionInstruction({
    keys,
    programId: a.warpProgramPubKey,
    // Array of 1s is an arbitrary 8 byte "discriminator" (same as the SDK)
    data: Buffer.concat([Buffer.from([1, 1, 1, 1, 1, 1, 1, 1]), Buffer.from(serializedData)]),
  });
  const setComputeLimitInstruction = ComputeBudgetProgram.setComputeUnitLimit({
    units: SOLANA_CU_LIMIT,
  });
  const setPriorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: (await a.getMedianPriorityFee()) || 0,
  });
  const recentBlockhash = (await a.getProvider().getLatestBlockhash('finalized')).blockhash;
  const tx = new Transaction({
    feePayer: fromWalletPubKey,
    blockhash: recentBlockhash,
    recentBlockhash,
  } as any)
    .add(setComputeLimitInstruction)
    .add(setPriorityFeeInstruction)
    .add(transferRemoteInstruction);
  // Lighthouse/Phantom: do NOT sign here — the wallet signs first, the
  // randomWallet signs afterward (in useCustomSolanaTransactionFns).
  (tx as any)[ADDITIONAL_SIGNERS_KEY] = [randomWallet];
  return tx;
}

export class CustomSealevelHypSyntheticAdapter extends SealevelHypSyntheticAdapter {
  override populateTransferRemoteTx(params: TransferRemoteParams): Promise<Transaction> {
    return buildUnsignedTransferRemoteTx(this, params);
  }
}

export class CustomSealevelHypNativeAdapter extends SealevelHypNativeAdapter {
  override populateTransferRemoteTx(params: TransferRemoteParams): Promise<Transaction> {
    return buildUnsignedTransferRemoteTx(this, params);
  }
}

export class CustomSealevelHypCollateralAdapter extends SealevelHypCollateralAdapter {
  override populateTransferRemoteTx(params: TransferRemoteParams): Promise<Transaction> {
    return buildUnsignedTransferRemoteTx(this, params);
  }
}
