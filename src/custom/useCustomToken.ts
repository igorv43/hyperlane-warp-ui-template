/**
 * Hook para usar tokens com adapters customizados
 * 
 * Este hook pode ser usado para criar tokens com os adapters corrigidos
 * quando necessário, especialmente para tokens CwHypCollateral com colateral CW20
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
 * Cria um token com adapter customizado se necessário
 */
export function useCustomToken(
  token: IToken | undefined,
  multiProvider: MultiProtocolProvider | undefined,
): Token | undefined {
  return useMemo(() => {
    if (!token || !multiProvider) return undefined;

    // Se for CwHypCollateral, verifica se precisa do adapter customizado
    if (token.standard === TokenStandard.CwHypCollateral && token.collateralAddressOrDenom) {
      try {
        // Cria o token normalmente
        const customToken = new Token(token);

        // Substitui o adapter pelo customizado
        // @ts-ignore - Acessando propriedade privada para substituir o adapter
        const customAdapter = new CwHypCollateralAdapter(
          token.chainName,
          multiProvider,
          {
            warpRouter: token.addressOrDenom,
            token: token.collateralAddressOrDenom,
          },
        );

        // @ts-ignore - Substituindo o adapter interno
        customToken.adapter = customAdapter;

        return customToken;
      } catch (error) {
        console.warn('Error creating custom token adapter, using default:', error);
        return new Token(token);
      }
    }

    // Para outros padrões, retorna o token normal
    return new Token(token);
  }, [token, multiProvider]);
}
