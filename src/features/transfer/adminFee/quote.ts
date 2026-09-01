/**
 * Administrative fee quote — converts the fixed USD amount to the NATIVE currency
 * of the origin chain, with a REAL-TIME price.
 *
 * Primary source: Binance (public ticker, ~instant). Fallback: CoinGecko.
 * Pure function (no React) so it can be reused in the UI (hook) and at send time.
 */
import { ADMIN_FEE_USD, AdminFeeChain, getAdminFeeChain } from '../../../consts/adminFee';
import { logger } from '../../../utils/logger';

export interface AdminFeeQuote {
  chainName: string;
  chain: AdminFeeChain;
  feeUsd: number;
  priceUsd: number; // price of the native token in USD
  source: 'binance' | 'coingecko';
  /** fee amount in the native token's smallest unit (uluna/wei/lamports), as a string */
  amountBaseUnits: string;
  /** "human" amount already formatted for display (e.g. "8,333.5 LUNC") */
  amountHuman: string;
}

async function fetchBinancePrice(symbol?: string): Promise<number | null> {
  if (!symbol) return null;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { price?: string };
    const p = Number(data?.price);
    return Number.isFinite(p) && p > 0 ? p : null;
  } catch {
    return null;
  }
}

async function fetchCoinGeckoPrice(id?: string): Promise<number | null> {
  if (!id) return null;
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Record<string, { usd?: number }>;
    const p = data?.[id]?.usd;
    return typeof p === 'number' && p > 0 ? p : null;
  } catch {
    return null;
  }
}

/** feeUsd / price -> base units of the native token, rounding UP (never undercharge). */
function usdToBaseUnits(feeUsd: number, priceUsd: number, decimals: number): string {
  const human = feeUsd / priceUsd; // amount in the native token (float)
  // decimals <= 18 and small values: safe within Number, but we do it in two
  // steps to minimize loss: integer part + scaled fraction.
  const scaled = human * Math.pow(10, decimals);
  return BigInt(Math.ceil(scaled)).toString();
}

function formatHuman(baseUnits: string, decimals: number, symbol: string): string {
  const n = Number(baseUnits) / Math.pow(10, decimals);
  const frac = n >= 1000 ? 2 : n >= 1 ? 4 : 6;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: frac })} ${symbol}`;
}

/**
 * Quotes the fee for a chain. Returns null if the fee is disabled on that chain
 * (no wallet) OR if NO price source responded (in that case the send proceeds without
 * the fee — we never block the user's transfer over a price hiccup).
 */
export async function quoteAdminFee(chainName?: string): Promise<AdminFeeQuote | null> {
  const chain = getAdminFeeChain(chainName);
  if (!chain || !chainName) return null;

  let priceUsd = await fetchBinancePrice(chain.binanceSymbol);
  let source: 'binance' | 'coingecko' = 'binance';
  if (!priceUsd) {
    priceUsd = await fetchCoinGeckoPrice(chain.coinGeckoId);
    source = 'coingecko';
  }
  if (!priceUsd) {
    logger.warn(`[adminFee] no price for ${chain.nativeSymbol} — fee skipped for this tx`);
    return null;
  }

  const amountBaseUnits = usdToBaseUnits(ADMIN_FEE_USD, priceUsd, chain.nativeDecimals);
  return {
    chainName,
    chain,
    feeUsd: ADMIN_FEE_USD,
    priceUsd,
    source,
    amountBaseUnits,
    amountHuman: formatHuman(amountBaseUnits, chain.nativeDecimals, chain.nativeSymbol),
  };
}
