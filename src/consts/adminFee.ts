/**
 * Taxa administrativa — cobrada por transferência para manter a UI no ar.
 *
 * 100% CONFIGURÁVEL por quem hospeda (projeto descentralizado): cada operador
 * informa AS PRÓPRIAS carteiras no .env. Sem carteira definida numa chain, a taxa
 * fica DESLIGADA nela — nada é cobrado (default seguro para quem baixa e não configura).
 *
 * O valor é FIXO em USD e convertido em tempo real para a moeda NATIVA da chain de
 * origem (LUNC/BNB/ETH/SOL) na hora do envio — ver src/features/transfer/adminFee.
 *
 * IMPORTANTE (Next.js): variáveis NEXT_PUBLIC_* são embutidas no BUILD. Quem
 * self-hospeda define os valores e builda a própria imagem.
 */

export interface AdminFeeChain {
  /** carteira que RECEBE a taxa, no formato nativo da chain */
  recipient: string;
  /** símbolo do nativo, só para exibição */
  nativeSymbol: string;
  /** casas decimais do nativo (LUNC 6, BNB/ETH 18, SOL 9) */
  nativeDecimals: number;
  /** cosmos: denom do nativo (bank MsgSend) */
  nativeDenom?: string;
  /** par na Binance para preço em tempo real (fonte primária) */
  binanceSymbol?: string;
  /** id no CoinGecko (fonte de fallback) */
  coinGeckoId?: string;
}

/** Valor fixo da taxa, em USD. Ajustável por env (default $0,50). */
export const ADMIN_FEE_USD = (() => {
  const v = Number(process.env.NEXT_PUBLIC_ADMIN_FEE_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
})();

/**
 * Mapa fixo dos metadados de cada chain (nativo/decimais/preço). As CARTEIRAS vêm
 * do .env — troque livremente. A chave é o chainName exato do registry Hyperlane.
 */
export const ADMIN_FEE_CHAINS: Record<string, AdminFeeChain> = {
  terraclassic: {
    recipient: process.env.NEXT_PUBLIC_ADMIN_FEE_WALLET_TERRACLASSIC || '',
    nativeSymbol: 'LUNC',
    nativeDecimals: 6,
    nativeDenom: 'uluna',
    binanceSymbol: 'LUNCUSDT',
    coinGeckoId: 'terra-luna',
  },
  bsc: {
    recipient: process.env.NEXT_PUBLIC_ADMIN_FEE_WALLET_BSC || '',
    nativeSymbol: 'BNB',
    nativeDecimals: 18,
    binanceSymbol: 'BNBUSDT',
    coinGeckoId: 'binancecoin',
  },
  ethereum: {
    recipient: process.env.NEXT_PUBLIC_ADMIN_FEE_WALLET_ETHEREUM || '',
    nativeSymbol: 'ETH',
    nativeDecimals: 18,
    binanceSymbol: 'ETHUSDT',
    coinGeckoId: 'ethereum',
  },
  solanamainnet: {
    recipient: process.env.NEXT_PUBLIC_ADMIN_FEE_WALLET_SOLANA || '',
    nativeSymbol: 'SOL',
    nativeDecimals: 9,
    binanceSymbol: 'SOLUSDT',
    coinGeckoId: 'solana',
  },
};

/**
 * Retorna a config da taxa para a chain SÓ SE houver carteira definida.
 * Sem carteira (ou taxa zerada) → undefined = taxa desligada nessa chain.
 */
export function getAdminFeeChain(chainName?: string): AdminFeeChain | undefined {
  if (!chainName || ADMIN_FEE_USD <= 0) return undefined;
  const c = ADMIN_FEE_CHAINS[chainName];
  if (!c || !c.recipient) return undefined;
  return c;
}

/** true se existe alguma chain com taxa configurada (para exibir avisos gerais). */
export function isAdminFeeEnabledAnywhere(): boolean {
  return ADMIN_FEE_USD > 0 && Object.values(ADMIN_FEE_CHAINS).some((c) => !!c.recipient);
}
