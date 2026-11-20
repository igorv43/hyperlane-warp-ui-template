/**
 * IGP (interchain gas paymaster) of each Cosmos chain whose interchain fee is
 * quoted ON-CHAIN at transfer time. For these origins the registry's static
 * `interchainFeeConstants` are ignored: a fixed amount goes stale whenever the
 * gas oracle is updated and the transfer then fails inside the mailbox with
 * "insufficient funds".
 */
export const COSMOS_IGP: Record<string, string> = {
  terraclassic: 'terra1taunhg629rssf3g939nqr0h594q5mssrzdj5lkx2hygmxmh72ghqeqqnvz',
};

/** True when the chain's interchain fee is quoted dynamically from its IGP. */
export function hasDynamicCosmosIgp(chainName: string): boolean {
  return !!COSMOS_IGP[chainName];
}
