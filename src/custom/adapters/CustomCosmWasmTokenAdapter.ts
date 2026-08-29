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
  CwHypNativeAdapter as SDKCwHypNativeAdapter,
  CwNativeTokenAdapter as SDKCwNativeTokenAdapter,
} from '@hyperlane-xyz/sdk';
import type { Address } from '@hyperlane-xyz/utils';
import { addressToBytes32, strip0x } from '@hyperlane-xyz/utils';
import { logger } from '../../utils/logger';

/**
 * IGP de cada chain Cosmos (endereço de infra — os VALORES da taxa são cotados
 * on-chain na hora, dinâmicos, como já acontece em BSC/ETH/Solana).
 */
const COSMOS_IGP: Record<string, string> = {
  terraclassic: 'terra1taunhg629rssf3g939nqr0h594q5mssrzdj5lkx2hygmxmh72ghqeqqnvz',
};

/**
 * Cota o IGP Cosmos on-chain: lê o gás cobrado do domínio (gas_for_domain,
 * com fallback no default_gas) e pede quote_gas_payment. Substitui as
 * interchainFeeConstants fixas do registry — o SDK lança "not implemented" p/ CW.
 */
async function quoteCosmosIgp(
  chainName: string,
  provider: any,
  destination: number,
): Promise<{ igpQuote: { amount: bigint; addressOrDenom: string } }> {
  const igp = COSMOS_IGP[chainName];
  if (!igp) throw new Error(`IGP não configurado para a chain ${chainName}`);
  let gas: string;
  try {
    const r = await provider.queryContractSmart(igp, {
      igp: { gas_for_domain: { domains: [destination] } },
    });
    const entry = (r.gas ?? []).find((g: any) => Number(g[0]) === destination);
    if (!entry) throw new Error('sem gás específico p/ o domínio');
    gas = entry[1].toString();
  } catch {
    const d = await provider.queryContractSmart(igp, { igp: { default_gas: {} } });
    gas = d.gas.toString();
  }
  const q = await provider.queryContractSmart(igp, {
    igp: { quote_gas_payment: { dest_domain: destination, gas_amount: gas } },
  });
  // +2% de folga: o oracle pode atualizar entre a cotação e a inclusão da tx;
  // o excedente vai para o beneficiary do IGP (o vault) — não se perde.
  const amount = (BigInt(q.gas_needed) * 102n) / 100n;
  logger.info(
    `[quoteCosmosIgp] ${chainName} → dom ${destination}: gás ${gas} → ${amount} uluna (on-chain, dinâmico)`,
  );
  return { igpQuote: { amount, addressOrDenom: 'uluna' } };
}

/**
 * Custom CwHypNativeAdapter (standard CwHypNative — warp de moeda NATIVA, ex.
 * LUNC/uluna). No SDK, populateTransferRemoteTx já funciona (soma valor + fee
 * em uluna nos funds), mas quoteTransferRemoteGas delega ao adapter sintético,
 * que lança "not implemented" — aqui cotamos o IGP on-chain, como no CW20.
 */
export class CwHypNativeAdapter extends SDKCwHypNativeAdapter {
  /** Cotação dinâmica do IGP (o SDK lança "not implemented" p/ CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }
}

/**
 * Custom CwNativeTokenAdapter que corrige métodos se necessário
 */
export class CwNativeTokenAdapter extends SDKCwNativeTokenAdapter {
  /** Cotação dinâmica do IGP (o SDK lança "not implemented" p/ CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }
}

/**
 * Custom CwHypCollateralAdapter que corrige populateTransferRemoteTx()
 * para suportar tokens CW20 como colateral
 */
export class CwHypCollateralAdapter extends SDKCwHypCollateralAdapter {
  /** Cotação dinâmica do IGP (o SDK lança "not implemented" p/ CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }

  /**
   * Sobrescreve populateTransferRemoteTx() para corrigir o uso de funds quando o colateral é CW20
   * 
   * PROBLEMA: O SDK usa collateralDenom nos funds, mas quando o colateral é CW20,
   * não devemos incluir o endereço do contrato nos funds. As taxas devem vir apenas
   * de interchainFeeConstants.addressOrDenom (igpDenom).
   */
  async populateTransferRemoteTx({
    destination,
    recipient,
    weiAmountOrId,
    interchainGas,
  }: {
    destination: number;
    recipient: string;
    weiAmountOrId: string | bigint;
    interchainGas?: any;
  }): Promise<any> {
    // @ts-ignore - cw20adapter é privado mas necessário para obter tokenType
    const tokenType = await this.cw20adapter.getTokenType();
    
    logger.info(
      `[CwHypCollateralAdapter] populateTransferRemoteTx() called for token ${this.addresses.token} on chain ${this.chainName}`,
      { tokenType, destination, recipient, weiAmountOrId },
    );
    
    // Se o colateral for CW20, não usar collateralDenom nos funds
    // As taxas devem vir apenas de interchainFeeConstants (igpDenom)
    if ('cw20' in tokenType || 'c_w20' in tokenType) {
      logger.info(
        `[CwHypCollateralAdapter] populateTransferRemoteTx() for CW20 collateral - using only igpDenom for fees`,
      );
      
      if (!interchainGas) {
        interchainGas = await this.quoteTransferRemoteGas({ destination });
      }
      
      const { igpQuote: { addressOrDenom: igpDenom, amount: igpAmount } } = interchainGas;
      
      if (!igpDenom) {
        throw new Error('Interchain gas denom required for Cosmos');
      }
      
      // Para CW20 como colateral, os funds devem conter apenas as taxas em igpDenom
      // NÃO devemos incluir collateralDenom porque é um endereço de contrato, não um denom
      // O token CW20 será transferido via transfer_remote, não precisa estar nos funds
      
      logger.debug(
        `[CwHypCollateralAdapter] Preparing router transaction with funds: ${igpAmount} ${igpDenom}`,
      );
      
      // @ts-ignore - cw20adapter.prepareRouter é necessário
      const tx = await this.cw20adapter.prepareRouter(
        {
          // eslint-disable-next-line camelcase
          transfer_remote: {
            // eslint-disable-next-line camelcase
            dest_domain: destination,
            recipient: strip0x(addressToBytes32(recipient)),
            amount: weiAmountOrId.toString(),
          },
        },
        [
          {
            amount: igpAmount.toString(),
            denom: igpDenom, // uluna das interchainFeeConstants
          },
        ],
      );
      
      logger.debug(
        `[CwHypCollateralAdapter] Router transaction prepared:`,
        JSON.stringify(tx, null, 2),
      );
      
      return tx;
    }
    
    // Se não for CW20, usa a lógica do pai (native collateral)
    return super.populateTransferRemoteTx({
      destination,
      recipient,
      weiAmountOrId,
      interchainGas,
    });
  }

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
   * Sobrescreve populateApproveTx() para gerar transação de aprovação quando o colateral é CW20
   * 
   * Para tokens CW20, precisamos gerar uma transação `increase_allowance` no contrato CW20,
   * dando permissão ao warp router para gastar os tokens do usuário.
   * 
   * NOTA: O SDK define populateApproveTx() que lança erro para tokens nativos.
   * Precisamos sobrescrever para suportar CW20.
   */
  // @ts-ignore - SDK define sem parâmetros mas WarpCore chama com parâmetros
  async populateApproveTx({
    weiAmountOrId,
    recipient,
  }: {
    weiAmountOrId: string | bigint;
    recipient: string;
  }): Promise<any> {
    try {
      // @ts-ignore - cw20adapter é privado mas necessário para obter tokenType
      const tokenType = await this.cw20adapter.getTokenType();

      logger.info(
        `[CwHypCollateralAdapter] populateApproveTx() called for token ${this.addresses.token} on chain ${this.chainName}`,
        { tokenType, recipient, weiAmountOrId },
      );

      // Se o colateral for CW20, gera a transação de aprovação
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        logger.info(
          `[CwHypCollateralAdapter] populateApproveTx() for CW20 collateral - generating increase_allowance transaction`,
        );

        // O recipient é o warp router (spender)
        // O contrato CW20 é this.addresses.token

        // Prepara a transação increase_allowance no contrato CW20
        // Similar ao CwTokenAdapter.populateApproveTx()
        const tx = {
          contractAddress: this.addresses.token, // Contrato CW20 colateral
          msg: {
            // eslint-disable-next-line camelcase
            increase_allowance: {
              spender: recipient, // Warp router (o recipient passado pelo WarpCore)
              amount: weiAmountOrId.toString(),
              expires: {
                never: {},
              },
            },
          },
          funds: [], // Não precisa de funds para increase_allowance
        };

        logger.debug(
          `[CwHypCollateralAdapter] Approval transaction prepared:`,
          JSON.stringify(tx, null, 2),
        );

        return tx;
      }

      // Se não for CW20, usa a lógica do pai (que lança erro para tokens nativos)
      // @ts-ignore - SDK define sem parâmetros
      return super.populateApproveTx({ weiAmountOrId, recipient });
    } catch (error) {
      logger.error(
        `[CwHypCollateralAdapter] Error generating approval transaction:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Sobrescreve isApproveRequired() para verificar allowance quando o colateral é CW20
   * 
   * Para tokens CW20, precisamos verificar se o warp router tem allowance suficiente
   * para gastar os tokens do usuário.
   * 
   * NOTA: O SDK define isApproveRequired() sem parâmetros, mas o WarpCore chama com 3.
   * Usamos @ts-ignore para contornar essa inconsistência.
   */
  // @ts-ignore - SDK define sem parâmetros mas WarpCore chama com 3
  async isApproveRequired(
    owner?: Address,
    spender?: Address,
    weiAmountOrId?: string | bigint,
  ): Promise<boolean> {
    try {
      // @ts-ignore - cw20adapter é privado mas necessário para obter tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.info(
        `[CwHypCollateralAdapter] isApproveRequired() called for owner ${owner}, spender ${spender}, amount ${weiAmountOrId}`,
      );
      
      // Se o colateral for CW20, verifica o allowance
      if (('cw20' in tokenType || 'c_w20' in tokenType) && owner && spender && weiAmountOrId) {
        const provider = await this.getProvider();
        const amount = BigInt(weiAmountOrId.toString());
        
        // Consulta o allowance do token CW20 para o spender (warp router)
        const response = await provider.queryContractSmart(this.addresses.token, {
          allowance: {
            owner: owner,
            spender: spender,
          },
        });
        
        // @ts-ignore - response pode ser AllowanceResponse
        const currentAllowance = BigInt((response as { allowance?: string }).allowance || '0');
        
        logger.info(
          `[CwHypCollateralAdapter] Current allowance: ${currentAllowance}, Required: ${amount}, isRequired: ${currentAllowance < amount}`,
        );
        
        // Retorna true se o allowance atual é menor que o necessário
        return currentAllowance < amount;
      }
      
      // Se não tiver parâmetros ou não for CW20, retorna false (não precisa de approve)
      if (!owner || !spender || !weiAmountOrId) {
        logger.debug(
          `[CwHypCollateralAdapter] isApproveRequired() called without required parameters, returning false`,
        );
        return false;
      }
      
      // Se não for CW20, usa a lógica do pai (native tokens não precisam de approve)
      // @ts-ignore - SDK define sem parâmetros
      return super.isApproveRequired();
    } catch (error) {
      logger.warn(
        `[CwHypCollateralAdapter] Error checking allowance, assuming approval required:`,
        error,
      );
      // Em caso de erro, assume que precisa de approve para ser seguro
      return true;
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
