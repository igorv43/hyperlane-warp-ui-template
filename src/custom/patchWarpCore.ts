/**
 * Patch to apply custom adapters to the WarpCore
 *
 * This file automatically applies the fixes for CwHypCollateral tokens
 * with CW20 collateral when creating the WarpCore.
 */

import {
    TokenStandard,
    WarpCore,
    type MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';
import { logger } from '../utils/logger';
import { CwHypCollateralAdapter, CwHypNativeAdapter } from './adapters/CustomCosmWasmTokenAdapter';
import {
  CustomSealevelHypCollateralAdapter,
  CustomSealevelHypNativeAdapter,
  CustomSealevelHypSyntheticAdapter,
} from './adapters/CustomSealevelTokenAdapter';

/**
 * Applies custom adapters to the WarpCore tokens that need them
 *
 * @param warpCore - The WarpCore created normally
 * @param multiProvider - The MultiProtocolProvider used
 * @returns The same WarpCore with custom adapters applied
 */
export function patchWarpCore(
  warpCore: WarpCore,
  _multiProvider: MultiProtocolProvider, // Used inside the overridden functions
): WarpCore {
  let patchedCount = 0;

  warpCore.tokens.forEach((token) => {
    // Apply the custom adapter only to CwHypCollateral tokens
    if (
      token.standard === TokenStandard.CwHypCollateral &&
      token.collateralAddressOrDenom
    ) {
      try {
        logger.info(
          `Patching token ${token.symbol} on ${token.chainName} with collateral ${token.collateralAddressOrDenom}`,
        );
        
        // Override getHypAdapter to return the custom adapter
        const originalGetHypAdapter = token.getHypAdapter.bind(token);
        // @ts-ignore - Overriding a Token method
        token.getHypAdapter = function(multiProviderArg: MultiProtocolProvider, destination?: any) {
          // If it is CwHypCollateral, return the custom adapter
          if (this.standard === TokenStandard.CwHypCollateral && this.collateralAddressOrDenom) {
            logger.debug(
              `Using custom adapter for token ${this.symbol} on ${this.chainName}`,
            );
            return new CwHypCollateralAdapter(
              this.chainName,
              multiProviderArg,
              {
                warpRouter: this.addressOrDenom,
                token: this.collateralAddressOrDenom,
              },
            );
          }
          // Otherwise, use the original method
          return originalGetHypAdapter(multiProviderArg, destination);
        };
        
        patchedCount++;

        logger.info(
          `✅ Applied custom adapter override to token ${token.symbol} on ${token.chainName} (warpRouter: ${token.addressOrDenom}, collateral: ${token.collateralAddressOrDenom})`,
        );
      } catch (error) {
        logger.error(
          `❌ Error applying custom adapter to token ${token.symbol} on ${token.chainName}:`,
          error,
        );
      }
    } else if (token.standard === TokenStandard.CwHypNative) {
      // NATIVE-currency warp (e.g. LUNC/uluna): the SDK throws "not implemented"
      // in quoteTransferRemoteGas — use the custom adapter with dynamic
      // on-chain IGP quoting.
      try {
        const originalGetHypAdapter = token.getHypAdapter.bind(token);
        // @ts-ignore - Overriding a Token method
        token.getHypAdapter = function(multiProviderArg: MultiProtocolProvider, destination?: any) {
          if (this.standard === TokenStandard.CwHypNative) {
            logger.debug(
              `Using custom NATIVE adapter for token ${this.symbol} on ${this.chainName}`,
            );
            return new CwHypNativeAdapter(
              this.chainName,
              multiProviderArg,
              {
                warpRouter: this.addressOrDenom,
              },
            );
          }
          return originalGetHypAdapter(multiProviderArg, destination);
        };

        patchedCount++;

        logger.info(
          `✅ Applied custom NATIVE adapter override to token ${token.symbol} on ${token.chainName} (warpRouter: ${token.addressOrDenom})`,
        );
      } catch (error) {
        logger.error(
          `❌ Error applying custom native adapter to token ${token.symbol} on ${token.chainName}:`,
          error,
        );
      }
    } else if (
      token.standard === TokenStandard.SealevelHypSynthetic ||
      token.standard === TokenStandard.SealevelHypNative ||
      token.standard === TokenStandard.SealevelHypCollateral
    ) {
      // Solana: adapter that does NOT pre-sign with the randomWallet — Phantom
      // signs first and the randomWallet afterward (Lighthouse requirement).
      try {
        const originalGetHypAdapter = token.getHypAdapter.bind(token);
        // @ts-ignore - Overriding a Token method
        token.getHypAdapter = function (multiProviderArg: MultiProtocolProvider, destination?: any) {
          const mailbox = (multiProviderArg.tryGetChainMetadata(this.chainName) as any)?.mailbox;
          if (!mailbox) return originalGetHypAdapter(multiProviderArg, destination);
          if (this.standard === TokenStandard.SealevelHypSynthetic && this.collateralAddressOrDenom) {
            return new CustomSealevelHypSyntheticAdapter(this.chainName, multiProviderArg, {
              warpRouter: this.addressOrDenom,
              token: this.collateralAddressOrDenom,
              mailbox,
            });
          }
          if (this.standard === TokenStandard.SealevelHypCollateral && this.collateralAddressOrDenom) {
            return new CustomSealevelHypCollateralAdapter(this.chainName, multiProviderArg, {
              warpRouter: this.addressOrDenom,
              token: this.collateralAddressOrDenom,
              mailbox,
            });
          }
          if (this.standard === TokenStandard.SealevelHypNative) {
            return new CustomSealevelHypNativeAdapter(this.chainName, multiProviderArg, {
              warpRouter: this.addressOrDenom,
              mailbox,
            });
          }
          return originalGetHypAdapter(multiProviderArg, destination);
        };

        patchedCount++;

        logger.info(
          `✅ Applied custom Sealevel (Phantom sign-order) adapter to token ${token.symbol} on ${token.chainName}`,
        );
      } catch (error) {
        logger.error(
          `❌ Error applying custom Sealevel adapter to token ${token.symbol} on ${token.chainName}:`,
          error,
        );
      }
    } else {
      // Debug log - see which tokens are not being patched
      if (token.standard === TokenStandard.CwHypCollateral) {
        logger.debug(
          `Token ${token.symbol} on ${token.chainName} is CwHypCollateral but has no collateralAddressOrDenom`,
        );
      }
    }
  });

  if (patchedCount > 0) {
    logger.info(`Applied custom adapters to ${patchedCount} token(s)`);
  }

  return warpCore;
}
