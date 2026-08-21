/**
 * Cotação da taxa administrativa — converte o valor fixo em USD para a moeda NATIVA
 * da chain de origem, com preço em TEMPO REAL.
 *
 * Fonte primária: Binance (ticker público, ~instantâneo). Fallback: CoinGecko.
 * Função pura (sem React) para ser reusada na UI (hook) e na hora do envio.
 */
import { ADMIN_FEE_USD, AdminFeeChain, getAdminFeeChain } from '../../../consts/adminFee';
import { logger } from '../../../utils/logger';

export interface AdminFeeQuote {
  chainName: string;
  chain: AdminFeeChain;
  feeUsd: number;
  priceUsd: number; // preço do nativo em USD
  source: 'binance' | 'coingecko';
  /** quantidade da taxa na menor unidade do nativo (uluna/wei/lamports), como string */
  amountBaseUnits: string;
  /** quantidade "humana" já formatada p/ exibição (ex.: "8,333.5 LUNC") */
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

/** feeUsd / price -> unidades-base do nativo, arredondando para CIMA (nunca cobra a menos). */
function usdToBaseUnits(feeUsd: number, priceUsd: number, decimals: number): string {
  const human = feeUsd / priceUsd; // quantidade no nativo (float)
  // decimals <= 18 e valores pequenos: seguro dentro de Number, mas fazemos em duas
  // etapas para minimizar perda: parte inteira + fração escalada.
  const scaled = human * Math.pow(10, decimals);
  return BigInt(Math.ceil(scaled)).toString();
}

function formatHuman(baseUnits: string, decimals: number, symbol: string): string {
  const n = Number(baseUnits) / Math.pow(10, decimals);
  const frac = n >= 1000 ? 2 : n >= 1 ? 4 : 6;
  return `${n.toLocaleString('en-US', { maximumFractionDigits: frac })} ${symbol}`;
}

/**
 * Cota a taxa para uma chain. Retorna null se a taxa está desligada nessa chain
 * (sem carteira) OU se NENHUMA fonte de preço respondeu (aí o envio segue sem taxa,
 * nunca travamos a transferência do usuário por um soluço de preço).
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
    logger.warn(`[adminFee] sem preço para ${chain.nativeSymbol} — taxa pulada nesta tx`);
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
