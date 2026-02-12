/**
 * Factory customizado para criar tokens com adapters corrigidos
 * 
 * Este factory sobrescreve a criação de tokens CwHypCollateral
 * para usar o CustomCwHypCollateralAdapter que corrige o bug
 * de suporte a CW20 como colateral
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
 * Factory customizado que cria tokens com adapters corrigidos
 */
export class CustomTokenFactory {
  /**
   * Cria um token com o adapter customizado quando necessário
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
    // Se for CwHypCollateral, usa o adapter customizado
    if (standard === TokenStandard.CwHypCollateral) {
      if (!options.collateralAddressOrDenom) {
        throw new Error('collateralAddressOrDenom required for CwHypCollateral');
      }

      // Cria o token normalmente
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

      // Substitui o adapter pelo customizado
      // @ts-ignore - Acessando propriedade privada para substituir o adapter
      const customAdapter = new CwHypCollateralAdapter(chainName, multiProvider, {
        warpRouter: addressOrDenom,
        token: options.collateralAddressOrDenom,
      });
      
      // @ts-ignore - Substituindo o adapter interno
      token.adapter = customAdapter;

      return token;
    }

    // Para outros padrões, usa a criação normal
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
