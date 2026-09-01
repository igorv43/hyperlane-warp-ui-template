/**
 * Memo written into the Cosmos (Terra Classic) transactions sent by the UI.
 *
 * Terra/Cosmos have a native `memo` field in the transaction — that's where we mark the
 * origin (e.g. "terraclassic-bridge"). Configurable per operator via NEXT_PUBLIC_TX_MEMO;
 * default "terraclassic-bridge". Empty string = no memo.
 *
 * Note: EVM (BSC/Ethereum) has NO memo field; Solana only via a Memo Program
 * instruction. Here we apply it only on Cosmos, which is the native case.
 */
export const TX_MEMO = (process.env.NEXT_PUBLIC_TX_MEMO ?? 'terraclassic-bridge').trim();
