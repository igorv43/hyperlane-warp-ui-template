/**
 * Memo escrito nas transações Cosmos (Terra Classic) enviadas pela UI.
 *
 * Terra/Cosmos têm um campo `memo` nativo na transação — é onde marcamos a origem
 * (ex.: "terraclassic-bridge"). Configurável por operador via NEXT_PUBLIC_TX_MEMO;
 * default "terraclassic-bridge". String vazia = sem memo.
 *
 * Observação: EVM (BSC/Ethereum) NÃO tem campo de memo; Solana só via instrução do
 * Memo Program. Aqui aplicamos apenas no Cosmos, que é o caso nativo.
 */
export const TX_MEMO = (process.env.NEXT_PUBLIC_TX_MEMO ?? 'terraclassic-bridge').trim();
