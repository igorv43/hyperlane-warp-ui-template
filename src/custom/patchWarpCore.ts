/**
 * Patch para aplicar adapters customizados ao WarpCore
 * 
 * Este arquivo aplica automaticamente as correções para tokens CwHypCollateral
 * com colateral CW20 ao criar o WarpCore.
 */

import {
    TokenStandard,
    WarpCore,
    type MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';
import { logger } from '../utils/logger';
import { CwHypCollateralAdapter } from './adapters/CustomCosmWasmTokenAdapter';

/**
 * Aplica adapters customizados aos tokens do WarpCore que precisam
 * 
 * @param warpCore - O WarpCore criado normalmente
 * @param multiProvider - O MultiProtocolProvider usado
 * @returns O mesmo WarpCore com adapters customizados aplicados
 */
export function patchWarpCore(
  warpCore: WarpCore,
  _multiProvider: MultiProtocolProvider, // Usado dentro das funções sobrescritas
): WarpCore {
  let patchedCount = 0;

  warpCore.tokens.forEach((token) => {
    // Aplica o adapter customizado apenas para tokens CwHypCollateral
    if (
      token.standard === TokenStandard.CwHypCollateral &&
      token.collateralAddressOrDenom
    ) {
      try {
        logger.info(
          `Patching token ${token.symbol} on ${token.chainName} with collateral ${token.collateralAddressOrDenom}`,
        );
        
        // Sobrescrever getHypAdapter para retornar o adapter customizado
        const originalGetHypAdapter = token.getHypAdapter.bind(token);
        // @ts-ignore - Sobrescrevendo método do Token
        token.getHypAdapter = function(multiProviderArg: MultiProtocolProvider, destination?: any) {
          // Se for CwHypCollateral, retorna o adapter customizado
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
          // Caso contrário, usa o método original
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
    } else {
      // Log para debug - ver quais tokens não estão sendo patchados
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
