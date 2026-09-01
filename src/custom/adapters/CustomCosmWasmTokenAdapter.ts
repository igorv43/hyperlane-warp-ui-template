/* eslint-disable camelcase -- snake_case fields are mandated by the CosmWasm contract JSON schema */
/**
 * Custom adapters to fix bugs in the Hyperlane SDK
 *
 * This file contains custom classes that extend the SDK classes
 * to fix issues with CW20 tokens, especially for CwHypCollateral
 * with CW20 collateral.
 *
 * These customizations are kept in src/custom so they are not affected
 * by updates to the @hyperlane-xyz/sdk package
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
 * IGP of each Cosmos chain (infra address — the fee VALUES are quoted
 * on-chain at the time, dynamic, as already happens on BSC/ETH/Solana).
 */
const COSMOS_IGP: Record<string, string> = {
  terraclassic: 'terra1taunhg629rssf3g939nqr0h594q5mssrzdj5lkx2hygmxmh72ghqeqqnvz',
};

/**
 * Quotes the Cosmos IGP on-chain: reads the gas charged for the domain (gas_for_domain,
 * with fallback to default_gas) and requests quote_gas_payment. Replaces the registry's
 * fixed interchainFeeConstants — the SDK throws "not implemented" for CW.
 */
async function quoteCosmosIgp(
  chainName: string,
  provider: any,
  destination: number,
): Promise<{ igpQuote: { amount: bigint; addressOrDenom: string } }> {
  const igp = COSMOS_IGP[chainName];
  if (!igp) throw new Error(`IGP not configured for chain ${chainName}`);
  let gas: string;
  try {
    const r = await provider.queryContractSmart(igp, {
      igp: { gas_for_domain: { domains: [destination] } },
    });
    const entry = (r.gas ?? []).find((g: any) => Number(g[0]) === destination);
    if (!entry) throw new Error('no domain-specific gas');
    gas = entry[1].toString();
  } catch {
    const d = await provider.queryContractSmart(igp, { igp: { default_gas: {} } });
    gas = d.gas.toString();
  }
  const q = await provider.queryContractSmart(igp, {
    igp: { quote_gas_payment: { dest_domain: destination, gas_amount: gas } },
  });
  // +2% headroom: the oracle may update between the quote and the tx inclusion;
  // the excess goes to the IGP beneficiary (the vault) — it is not lost.
  const amount = (BigInt(q.gas_needed) * 102n) / 100n;
  logger.info(
    `[quoteCosmosIgp] ${chainName} → dom ${destination}: gas ${gas} → ${amount} uluna (on-chain, dynamic)`,
  );
  return { igpQuote: { amount, addressOrDenom: 'uluna' } };
}

/**
 * Custom CwHypNativeAdapter (CwHypNative standard — NATIVE-currency warp, e.g.
 * LUNC/uluna). In the SDK, populateTransferRemoteTx already works (sums value + fee
 * in uluna in the funds), but quoteTransferRemoteGas delegates to the synthetic adapter,
 * which throws "not implemented" — here we quote the IGP on-chain, as with CW20.
 */
export class CwHypNativeAdapter extends SDKCwHypNativeAdapter {
  /** Dynamic IGP quoting (the SDK throws "not implemented" for CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }
}

/**
 * Custom CwNativeTokenAdapter that fixes methods if needed
 */
export class CwNativeTokenAdapter extends SDKCwNativeTokenAdapter {
  /** Dynamic IGP quoting (the SDK throws "not implemented" for CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }
}

/**
 * Custom CwHypCollateralAdapter that fixes populateTransferRemoteTx()
 * to support CW20 tokens as collateral
 */
export class CwHypCollateralAdapter extends SDKCwHypCollateralAdapter {
  /** Dynamic IGP quoting (the SDK throws "not implemented" for CW). */
  async quoteTransferRemoteGas({ destination }: { destination: number }): Promise<any> {
    return quoteCosmosIgp(this.chainName, await this.getProvider(), destination);
  }

  /**
   * Overrides populateTransferRemoteTx() to fix the use of funds when the collateral is CW20
   *
   * PROBLEM: The SDK uses collateralDenom in the funds, but when the collateral is CW20,
   * we must not include the contract address in the funds. The fees must come only
   * from interchainFeeConstants.addressOrDenom (igpDenom).
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
    // @ts-ignore - cw20adapter is private but needed to get tokenType
    const tokenType = await this.cw20adapter.getTokenType();
    
    logger.info(
      `[CwHypCollateralAdapter] populateTransferRemoteTx() called for token ${this.addresses.token} on chain ${this.chainName}`,
      { tokenType, destination, recipient, weiAmountOrId },
    );
    
    // If the collateral is CW20, do not use collateralDenom in the funds
    // The fees must come only from interchainFeeConstants (igpDenom)
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
      
      // For CW20 as collateral, the funds must contain only the fees in igpDenom
      // We must NOT include collateralDenom because it is a contract address, not a denom
      // The CW20 token will be transferred via transfer_remote; it does not need to be in the funds
      
      logger.debug(
        `[CwHypCollateralAdapter] Preparing router transaction with funds: ${igpAmount} ${igpDenom}`,
      );
      
      // @ts-ignore - cw20adapter.prepareRouter is needed
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
            denom: igpDenom, // uluna from the interchainFeeConstants
          },
        ],
      );
      
      logger.debug(
        `[CwHypCollateralAdapter] Router transaction prepared:`,
        JSON.stringify(tx, null, 2),
      );
      
      return tx;
    }
    
    // If it is not CW20, use the parent's logic (native collateral)
    return super.populateTransferRemoteTx({
      destination,
      recipient,
      weiAmountOrId,
      interchainGas,
    });
  }

  /**
   * Overrides getDenom() to support CW20 as collateral
   * When the token_type is "cw20", returns the collateral token address
   */
  async getDenom(): Promise<string> {
    try {
      logger.info(
        `[CwHypCollateralAdapter] getDenom() called for token ${this.addresses.token} on chain ${this.chainName}`,
      );
      
      // @ts-ignore - cw20adapter is private but needed to get tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.debug(
        `[CwHypCollateralAdapter] tokenType received: ${JSON.stringify(tokenType)}`,
      );
      
      // If it is a native token, use the parent's logic
      if ('native' in tokenType) {
        if ('fungible' in tokenType.native) {
          const denom = tokenType.native.fungible.denom;
          logger.debug(`[CwHypCollateralAdapter] Native token, returning denom: ${denom}`);
          return denom;
        }
      }
      
      // ✅ If it is CW20, return the collateral token address
      // The contract may return 'cw20' or 'c_w20' (with underscore)
      // Actual returned format: { "type": { "c_w20": { "contract": "..." } } }
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        // If it is c_w20, take the contract from the object (the contract's actual format)
        if ('c_w20' in tokenType) {
          const cw20Data = tokenType.c_w20 as { contract?: string };
          const contract = cw20Data.contract || this.addresses.token;
          logger.debug(
            `[CwHypCollateralAdapter] c_w20 token, returning contract: ${contract}`,
          );
          return contract;
        }
        // If it is cw20, take the address from the object (alternative format)
        if ('cw20' in tokenType) {
          const cw20Data = tokenType.cw20 as { address?: string; contract?: string };
          const address = cw20Data.contract || cw20Data.address || this.addresses.token;
          logger.debug(`[CwHypCollateralAdapter] cw20 token, returning address: ${address}`);
          return address;
        }
        logger.debug(
          `[CwHypCollateralAdapter] CW20 token but no contract/address found, using fallback: ${this.addresses.token}`,
        );
        return this.addresses.token; // Address of the CW20 collateral
      }
      
      const errorMsg = `Token type not supported: ${JSON.stringify(tokenType)}`;
      logger.error('[CwHypCollateralAdapter] Token type not supported', new Error(errorMsg));
      throw new Error(errorMsg);
    } catch (error) {
      // If there is an error getting token_type, try using the token address directly
      logger.warn(
        `[CwHypCollateralAdapter] Error getting token type, using addresses.token as fallback:`,
        error,
      );
      return this.addresses.token;
    }
  }

  /**
   * Overrides populateApproveTx() to generate an approval transaction when the collateral is CW20
   *
   * For CW20 tokens, we need to generate an `increase_allowance` transaction on the CW20 contract,
   * giving the warp router permission to spend the user's tokens.
   *
   * NOTE: The SDK defines populateApproveTx() to throw an error for native tokens.
   * We need to override it to support CW20.
   */
  // @ts-ignore - SDK defines it without parameters but WarpCore calls it with parameters
  async populateApproveTx({
    weiAmountOrId,
    recipient,
  }: {
    weiAmountOrId: string | bigint;
    recipient: string;
  }): Promise<any> {
    try {
      // @ts-ignore - cw20adapter is private but needed to get tokenType
      const tokenType = await this.cw20adapter.getTokenType();

      logger.info(
        `[CwHypCollateralAdapter] populateApproveTx() called for token ${this.addresses.token} on chain ${this.chainName}`,
        { tokenType, recipient, weiAmountOrId },
      );

      // If the collateral is CW20, generate the approval transaction
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        logger.info(
          `[CwHypCollateralAdapter] populateApproveTx() for CW20 collateral - generating increase_allowance transaction`,
        );

        // The recipient is the warp router (spender)
        // The CW20 contract is this.addresses.token

        // Prepare the increase_allowance transaction on the CW20 contract
        // Similar to CwTokenAdapter.populateApproveTx()
        const tx = {
          contractAddress: this.addresses.token, // CW20 collateral contract
          msg: {
            // eslint-disable-next-line camelcase
            increase_allowance: {
              spender: recipient, // Warp router (the recipient passed by the WarpCore)
              amount: weiAmountOrId.toString(),
              expires: {
                never: {},
              },
            },
          },
          funds: [], // No funds needed for increase_allowance
        };

        logger.debug(
          `[CwHypCollateralAdapter] Approval transaction prepared:`,
          JSON.stringify(tx, null, 2),
        );

        return tx;
      }

      // If it is not CW20, use the parent's logic (which throws an error for native tokens)
      // @ts-ignore - SDK defines it without parameters
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
   * Overrides isApproveRequired() to check the allowance when the collateral is CW20
   *
   * For CW20 tokens, we need to check whether the warp router has enough allowance
   * to spend the user's tokens.
   *
   * NOTE: The SDK defines isApproveRequired() without parameters, but the WarpCore calls it with 3.
   * We use @ts-ignore to work around this inconsistency.
   */
  // @ts-ignore - SDK defines it without parameters but WarpCore calls it with 3
  async isApproveRequired(
    owner?: Address,
    spender?: Address,
    weiAmountOrId?: string | bigint,
  ): Promise<boolean> {
    try {
      // @ts-ignore - cw20adapter is private but needed to get tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.info(
        `[CwHypCollateralAdapter] isApproveRequired() called for owner ${owner}, spender ${spender}, amount ${weiAmountOrId}`,
      );
      
      // If the collateral is CW20, check the allowance
      if (('cw20' in tokenType || 'c_w20' in tokenType) && owner && spender && weiAmountOrId) {
        const provider = await this.getProvider();
        const amount = BigInt(weiAmountOrId.toString());
        
        // Query the CW20 token allowance for the spender (warp router)
        const response = await provider.queryContractSmart(this.addresses.token, {
          allowance: {
            owner: owner,
            spender: spender,
          },
        });
        
        // @ts-ignore - response may be AllowanceResponse
        const currentAllowance = BigInt((response as { allowance?: string }).allowance || '0');
        
        logger.info(
          `[CwHypCollateralAdapter] Current allowance: ${currentAllowance}, Required: ${amount}, isRequired: ${currentAllowance < amount}`,
        );
        
        // Return true if the current allowance is less than what is needed
        return currentAllowance < amount;
      }
      
      // If there are no parameters or it is not CW20, return false (no approve needed)
      if (!owner || !spender || !weiAmountOrId) {
        logger.debug(
          `[CwHypCollateralAdapter] isApproveRequired() called without required parameters, returning false`,
        );
        return false;
      }
      
      // If it is not CW20, use the parent's logic (native tokens do not need approve)
      // @ts-ignore - SDK defines it without parameters
      return super.isApproveRequired();
    } catch (error) {
      logger.warn(
        `[CwHypCollateralAdapter] Error checking allowance, assuming approval required:`,
        error,
      );
      // On error, assume approve is needed to be safe
      return true;
    }
  }

  /**
   * Overrides getBalance() to use queryToken when the collateral is CW20
   */
  async getBalance(address: Address): Promise<bigint> {
    try {
      logger.info(
        `🔵 [CwHypCollateralAdapter] getBalance() called for address ${address} on chain ${this.chainName}`,
      );
      
      // @ts-ignore - cw20adapter is private but needed to get tokenType
      const tokenType = await this.cw20adapter.getTokenType();
      
      logger.info(
        `🔵 [CwHypCollateralAdapter] tokenType received in getBalance: ${JSON.stringify(tokenType)}`,
      );
      
      // If it is CW20, use queryToken to query the balance
      // The contract may return 'cw20' or 'c_w20' (with underscore)
      if ('cw20' in tokenType || 'c_w20' in tokenType) {
        const provider = await this.getProvider();
        const response = await provider.queryContractSmart(this.addresses.token, {
          balance: {
            address: address,
          },
        });
        // @ts-ignore - response may be BalanceResponse
        const balance = (response as { balance?: string }).balance || '0';
        return BigInt(balance);
      }
      
      // If it is native, use the parent's logic
      const denom = await this.getDenom();
      const provider = await this.getProvider();
      const balance = await provider.getBalance(address, denom);
      return BigInt(balance.amount);
    } catch (error) {
      // Fall back to the parent's method
      logger.warn('Error in custom getBalance, falling back to parent:', error);
      return super.getBalance(address);
    }
  }
}
