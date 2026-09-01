/**
 * Custom factory to create tokens with fixed adapters
 *
 * This factory overrides the creation of CwHypCollateral tokens
 * to use the CustomCwHypCollateralAdapter, which fixes the bug
 * in CW20-as-collateral support
 */

import {
  Token,
  TokenStandard,
  type ChainName,
  type MultiProtocolProvider,
  type TokenConnection,
} from '@hyperlane-xyz/sdk';
import type { Address } from '@hyperlane-xyz/utils';
import { CwHypCollateralAdapter } from './adapters/CustomCosmWasmTokenAdapter';

/**
 * Custom factory that creates tokens with fixed adapters
 */
export class CustomTokenFactory {
  /**
   * Creates a token with the custom adapter when needed
   */
  static createToken(
    chainName: ChainName,
    standard: TokenStandard,
    addressOrDenom: Address,
    multiProvider: MultiProtocolProvider,
    options: {
      collateralAddressOrDenom?: Address;
      name: string;
      symbol: string;
      decimals: number;
      logoURI?: string;
      connections?: TokenConnection[];
    },
  ): Token {
    // If it is CwHypCollateral, use the custom adapter
    if (standard === TokenStandard.CwHypCollateral) {
      if (!options.collateralAddressOrDenom) {
        throw new Error('collateralAddressOrDenom required for CwHypCollateral');
      }

      // Create the token normally
      const token = new Token({
        chainName,
        standard,
        addressOrDenom,
        collateralAddressOrDenom: options.collateralAddressOrDenom,
        name: options.name,
        symbol: options.symbol,
        decimals: options.decimals,
        logoURI: options.logoURI,
        connections: options.connections,
      });

      // Replace the adapter with the custom one
      // @ts-ignore - Accessing private property to replace the adapter
      const customAdapter = new CwHypCollateralAdapter(chainName, multiProvider, {
        warpRouter: addressOrDenom,
        token: options.collateralAddressOrDenom,
      });
      
      // @ts-ignore - Replacing the internal adapter
      token.adapter = customAdapter;

      return token;
    }

    // For other standards, use normal creation
    return new Token({
      chainName,
      standard,
      addressOrDenom,
      collateralAddressOrDenom: options.collateralAddressOrDenom,
      name: options.name,
      symbol: options.symbol,
      decimals: options.decimals,
      logoURI: options.logoURI,
      connections: options.connections,
    });
  }
}
