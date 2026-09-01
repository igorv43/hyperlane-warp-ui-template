/**
 * Administrative fee — charged per transfer to keep the UI running.
 *
 * 100% CONFIGURABLE by whoever hosts it (decentralized project): each operator
 * provides THEIR OWN wallets in the .env. Without a wallet set for a chain, the fee
 * is DISABLED on it — nothing is charged (safe default for those who download and don't configure).
 *
 * The amount is FIXED in USD and converted in real time to the NATIVE currency of the
 * origin chain (LUNC/BNB/ETH/SOL) at send time — see src/features/transfer/adminFee.
 *
 * IMPORTANT (Next.js): NEXT_PUBLIC_* variables are embedded at BUILD time. Whoever
 * self-hosts sets the values and builds their own image.
 */

export interface AdminFeeChain {
  /** wallet that RECEIVES the fee, in the chain's native format */
  recipient: string;
  /** native token symbol, for display only */
  nativeSymbol: string;
  /** native token decimals (LUNC 6, BNB/ETH 18, SOL 9) */
  nativeDecimals: number;
  /** cosmos: denom of the native token (bank MsgSend) */
  nativeDenom?: string;
  /** Binance pair for the real-time price (primary source) */
  binanceSymbol?: string;
  /** CoinGecko id (fallback source) */
  coinGeckoId?: string;
}

/** Fixed fee amount, in USD. Adjustable via env (default $0.50). */
export const ADMIN_FEE_USD = (() => {
  const v = Number(process.env.NEXT_PUBLIC_ADMIN_FEE_USD);
  return Number.isFinite(v) && v >= 0 ? v : 0.5;
})();

/**
 * Fixed map of each chain's metadata (native token/decimals/price). The WALLETS come
 * from the .env — swap them freely. The key is the exact chainName from the Hyperlane registry.
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
 * Returns the fee config for the chain ONLY IF a wallet is set.
 * No wallet (or zero fee) → undefined = fee disabled on that chain.
 */
export function getAdminFeeChain(chainName?: string): AdminFeeChain | undefined {
  if (!chainName || ADMIN_FEE_USD <= 0) return undefined;
  const c = ADMIN_FEE_CHAINS[chainName];
  if (!c || !c.recipient) return undefined;
  return c;
}

/** true if any chain has the fee configured (to show general notices). */
export function isAdminFeeEnabledAnywhere(): boolean {
  return ADMIN_FEE_USD > 0 && Object.values(ADMIN_FEE_CHAINS).some((c) => !!c.recipient);
}
