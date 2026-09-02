/**
 * Pre-flight check of the ORIGIN chain's native-token balance.
 *
 * The native token (LUNC on Terra Classic, BNB, SOL…) pays network gas and
 * bridge fees even when the token being transferred is a different one
 * (e.g. sending JURIS still spends LUNC). With an empty native balance the
 * failure only surfaces deep inside wallet signing as an opaque
 * "Error while signing the transfer transaction" — so we check upfront and
 * tell the user exactly what is missing.
 */
import { MultiProtocolProvider, Token, TokenAmount, WarpCore } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { logger } from '../../utils/logger';

// Rough allowance for the network gas itself, which the warp fee quotes do
// not include. Cosmos/Terra Classic: ~1.2M gas × 28.325 uluna ≈ 34 LUNC.
// Solana: tx fee + possible ATA rent ≈ 0.003 SOL. EVM: the interchain quote
// (paid in native gas) dominates, so 0 works for the zero-balance case.
const GAS_BUFFER: Partial<Record<ProtocolType, bigint>> = {
  [ProtocolType.Cosmos]: 35_000_000n, // 35 LUNC (6 decimals)
  [ProtocolType.Sealevel]: 3_000_000n, // 0.003 SOL (9 decimals)
  [ProtocolType.Ethereum]: 0n,
};

interface CheckParams {
  warpCore: WarpCore;
  multiProvider: MultiProtocolProvider;
  originTokenAmount: TokenAmount;
  destination: string;
  recipient: string;
  sender: string;
  /** Admin fee in the origin native token's base units, if enabled */
  adminFeeBaseUnits?: string;
}

/**
 * Returns a user-friendly error message when the sender cannot cover gas +
 * fees with the origin's native token, or null when the balance is fine.
 * Never throws — on any estimation/RPC hiccup it returns null so a quote
 * problem cannot block a valid transfer.
 */
export async function checkOriginNativeGasBalance({
  warpCore,
  multiProvider,
  originTokenAmount,
  destination,
  recipient,
  sender,
  adminFeeBaseUnits,
}: CheckParams): Promise<string | null> {
  try {
    const origin = originTokenAmount.token.chainName;
    const chainMetadata = multiProvider.getChainMetadata(origin);
    const nativeToken = Token.FromChainMetadataNativeToken(chainMetadata);
    const symbol = nativeToken.symbol;
    const balance = await nativeToken.getBalance(multiProvider, sender);

    const fees = await warpCore.estimateTransferRemoteFees({
      originTokenAmount,
      destination,
      recipient,
      sender,
    });

    let required = GAS_BUFFER[originTokenAmount.token.protocol] ?? 0n;
    for (const quote of [fees.localQuote, fees.interchainQuote]) {
      if (quote && isSameNative(quote.token, nativeToken)) required += quote.amount;
    }
    if (adminFeeBaseUnits) required += BigInt(adminFeeBaseUnits);
    // Sending the native token itself: the amount also comes out of the balance
    if (isSameNative(originTokenAmount.token, nativeToken)) required += originTokenAmount.amount;

    if (balance.amount >= required) return null;

    const fmt = (wei: bigint) =>
      new TokenAmount(wei, nativeToken).getDecimalFormattedAmount().toFixed(2);
    return (
      `Not enough ${symbol} to pay network gas and bridge fees on ` +
      `${chainMetadata.displayName || origin}: you have ${fmt(balance.amount)} ${symbol}, ` +
      `but about ${fmt(required)} ${symbol} is needed. Transfers of any token still ` +
      `require ${symbol} for gas — top up your wallet and try again.`
    );
  } catch (error) {
    logger.warn('Native gas pre-flight check failed — proceeding without it', error);
    return null;
  }
}

function isSameNative(a: { chainName: string; addressOrDenom: string; isNative(): boolean }, b: Token): boolean {
  return (
    a.chainName === b.chainName &&
    (a.addressOrDenom === b.addressOrDenom || a.isNative() === b.isNative())
  );
}

/**
 * Maps late-stage wallet/broadcast errors about missing native funds to the
 * same friendly explanation (fallback for anything the pre-flight missed).
 */
export function friendlyInsufficientFundsError(
  errorDetails: string,
  multiProvider: MultiProtocolProvider,
  origin: string,
): string | null {
  const patterns =
    /insufficient funds|insufficient fee|is smaller than \d|NotEnoughBalance|insufficient lamports|InsufficientFundsForRent|gas required exceeds allowance/i;
  if (!patterns.test(errorDetails)) return null;
  try {
    const symbol = multiProvider.getChainMetadata(origin).nativeToken?.symbol || 'the native token';
    return (
      `Not enough ${symbol} in your wallet to pay network gas and fees. ` +
      `Transfers of any token still require ${symbol} for gas — top up and try again.`
    );
  } catch {
    return null;
  }
}
