/**
 * Hook to use tokens with custom adapters
 *
 * This hook can be used to create tokens with the fixed adapters
 * when needed, especially for CwHypCollateral tokens with CW20 collateral
 */

import { useMemo } from 'react';
import {
  Token,
  TokenStandard,
  type MultiProtocolProvider,
  type IToken,
} from '@hyperlane-xyz/sdk';
import { CwHypCollateralAdapter } from './adapters/CustomCosmWasmTokenAdapter';

/**
 * Creates a token with a custom adapter if needed
 */
export function useCustomToken(
  token: IToken | undefined,
  multiProvider: MultiProtocolProvider | undefined,
): Token | undefined {
  return useMemo(() => {
    if (!token || !multiProvider) return undefined;

    // If it is CwHypCollateral, check whether it needs the custom adapter
    if (token.standard === TokenStandard.CwHypCollateral && token.collateralAddressOrDenom) {
      try {
        // Create the token normally
        const customToken = new Token(token);

        // Replace the adapter with the custom one
        // @ts-ignore - Accessing private property to replace the adapter
        const customAdapter = new CwHypCollateralAdapter(
          token.chainName,
          multiProvider,
          {
            warpRouter: token.addressOrDenom,
            token: token.collateralAddressOrDenom,
          },
        );

        // @ts-ignore - Replacing the internal adapter
        customToken.adapter = customAdapter;

        return customToken;
      } catch (error) {
        console.warn('Error creating custom token adapter, using default:', error);
        return new Token(token);
      }
    }

    // For other standards, return the normal token
    return new Token(token);
  }, [token, multiProvider]);
}
