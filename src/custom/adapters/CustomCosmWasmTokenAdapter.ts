/**
 * Custom adapters para corrigir bugs no SDK do Hyperlane
 * 
 * Este arquivo contém classes customizadas que estendem as classes do SDK
 * para corrigir problemas com tokens CW20, especialmente para CwHypCollateral
 * com colateral CW20.
 * 
 * Estas customizações são mantidas em src/custom para não serem afetadas
 * por atualizações do pacote @hyperlane-xyz/sdk
 */

import {
  CwHypCollateralAdapter as SDKCwHypCollateralAdapter,
  CwNativeTokenAdapter as SDKCwNativeTokenAdapter,
} from '@hyperlane-xyz/sdk';
import type { Address } from '@hyperlane-xyz/utils';
import { logger } from '../../utils/logger';

/**
 * Custom CwNativeTokenAdapter que corrige métodos se necessário
 * (por enquanto mantém a mesma implementação, mas pode ser estendido)
 */
export class CwNativeTokenAdapter extends SDKCwNativeTokenAdapter {
  // Pode ser estendido no futuro se necessário
}

/**
 * Custom CwHypCollateralAdapter que corrige getDenom() e getBalance()
 * para suportar tokens CW20 como colateral
 */
export class CwHypCollateralAdapter extends SDKCwHypCollateralAdapter {
  /**
   * Sobrescreve getDenom() para suportar CW20 como colateral
   * Quando o token_type é "cw20", retorna o endereço do token colateral
   */
  async getDenom(): Promise<string> {
    try {
      logger.info(
        `[CwHypCollateralAdapter] getDenom() called for token ${this.addresses.token} on chain ${this.chainName}`,
      );
      
      // @ts-ignore - cw20adapter é privado mas necessário para obter tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.debug(
        `[CwHypCollateralAdapter] tokenType received: ${JSON.stringify(tokenType)}`,
      );
      
      // Se for token nativo, usa a lógica do pai
      if ('native' in tokenType) {
        if ('fungible' in tokenType.native) {
          const denom = tokenType.native.fungible.denom;
          logger.debug(`[CwHypCollateralAdapter] Native token, returning denom: ${denom}`);
          return denom;
        }
      }
      
      // ✅ Se for CW20, retorna o endereço do token colateral
      // O contrato pode retornar 'cw20' ou 'c_w20' (com underscore)
      // Formato real retornado: { "type": { "c_w20": { "contract": "..." } } }
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        // Se for c_w20, pega o contract do objeto (formato real do contrato)
        if ('c_w20' in tokenType) {
          const cw20Data = tokenType.c_w20 as { contract?: string };
          const contract = cw20Data.contract || this.addresses.token;
          logger.debug(
            `[CwHypCollateralAdapter] c_w20 token, returning contract: ${contract}`,
          );
          return contract;
        }
        // Se for cw20, pega o address do objeto (formato alternativo)
        if ('cw20' in tokenType) {
          const cw20Data = tokenType.cw20 as { address?: string; contract?: string };
          const address = cw20Data.contract || cw20Data.address || this.addresses.token;
          logger.debug(`[CwHypCollateralAdapter] cw20 token, returning address: ${address}`);
          return address;
        }
        logger.debug(
          `[CwHypCollateralAdapter] CW20 token but no contract/address found, using fallback: ${this.addresses.token}`,
        );
        return this.addresses.token; // Endereço do CW20 colateral
      }
      
      const errorMsg = `Token type not supported: ${JSON.stringify(tokenType)}`;
      logger.error('[CwHypCollateralAdapter] Token type not supported', new Error(errorMsg));
      throw new Error(errorMsg);
    } catch (error) {
      // Se houver erro ao obter token_type, tenta usar o endereço do token diretamente
      logger.warn(
        `[CwHypCollateralAdapter] Error getting token type, using addresses.token as fallback:`,
        error,
      );
      return this.addresses.token;
    }
  }

  /**
   * Sobrescreve getBalance() para usar queryToken quando o colateral é CW20
   */
  async getBalance(address: Address): Promise<bigint> {
    try {
      logger.info(
        `🔵 [CwHypCollateralAdapter] getBalance() called for address ${address} on chain ${this.chainName}`,
      );
      
      // @ts-ignore - cw20adapter é privado mas necessário para obter tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.info(
        `🔵 [CwHypCollateralAdapter] tokenType received in getBalance: ${JSON.stringify(tokenType)}`,
      );
      
      // Se for CW20, usa queryToken para consultar o balance
      // O contrato pode retornar 'cw20' ou 'c_w20' (com underscore)
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        const provider = await this.getProvider();
        const response = await provider.queryContractSmart(this.addresses.token, {
          balance: {
            address: address,
          },
        });
        // @ts-ignore - response pode ser BalanceResponse
        const balance = (response as { balance?: string }).balance || '0';
        return BigInt(balance);
      }
      
      // Se for native, usa a lógica do pai
      const denom = await this.getDenom();
      const provider = await this.getProvider();
      const balance = await provider.getBalance(address, denom);
      return BigInt(balance.amount);
    } catch (error) {
      // Fallback para o método do pai
      logger.warn('Error in custom getBalance, falling back to parent:', error);
      return super.getBalance(address);
    }
  }
}
