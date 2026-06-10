import { IRegistry, chainMetadata as publishedChainMetadata } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainMetadataSchema,
  mergeChainMetadataMap,
  RpcUrlSchema,
} from '@hyperlane-xyz/sdk';
import {
  objFilter,
  objMap,
  promiseObjAll,
  ProtocolType,
  tryParseJsonOrYaml
} from '@hyperlane-xyz/utils';
import { z } from 'zod';
import { chains as ChainsTS } from '../../consts/chains.ts';
import ChainsYaml from '../../consts/chains.yaml';
import { config } from '../../consts/config.ts';
import { links } from '../../consts/links.ts';
import { logger } from '../../utils/logger.ts';

export async function assembleChainMetadata(
  chainsInTokens: ChainName[],
  registry: IRegistry,
  storeMetadataOverrides?: ChainMap<Partial<ChainMetadata | undefined>>,
) {
  // Chains must include a cosmos chain or CosmosKit throws errors
  const result = z.record(ChainMetadataSchema).safeParse({
    ...ChainsYaml,
    ...ChainsTS,
  });
  if (!result.success) {
    logger.warn('Invalid chain metadata', result.error);
    throw new Error(`Invalid chain metadata: ${result.error.toString()}`);
  }
  const filesystemMetadata = result.data as ChainMap<ChainMetadata>;

  let registryChainMetadata: ChainMap<ChainMetadata>;
  if (config.registryUrl) {
    try {
      logger.debug('Using custom registry chain metadata from:', config.registryUrl);
      registryChainMetadata = await registry.getMetadata();
    } catch {
      logger.debug(
        'Failed fetching chain metadata from GH registry, using published registry',
        config.registryUrl,
      );
      registryChainMetadata = publishedChainMetadata;
    }
  } else {
    logger.debug('Using default published registry for chain metadata');
    registryChainMetadata = publishedChainMetadata;
  }

  // The registry is synced with the upstream Hyperlane registry, which includes chains whose
  // metadata uses enum values added in newer SDKs (e.g. technicalStack 'seismic',
  // blockExplorers.family 'tronscan'). This app pins an older @hyperlane-xyz/sdk, whose
  // ChainMetadataSchema rejects those values — and a single invalid chain makes the
  // MultiProtocolProvider constructor throw, crashing the whole app. Drop chains this SDK
  // version can't parse; the chains the app actually needs (those in its warp routes) are
  // standard and validate fine.
  registryChainMetadata = objFilter(
    registryChainMetadata,
    (chainName, metadata): metadata is ChainMetadata => {
      const parsed = ChainMetadataSchema.safeParse(metadata);
      if (parsed.success) return true;
      logger.warn(
        `Dropping registry chain "${chainName}" incompatible with this SDK:`,
        parsed.error.issues?.[0]?.message,
      );
      return false;
    },
  );

  // TODO have the registry do this automatically
  registryChainMetadata = await promiseObjAll(
    objMap(
      registryChainMetadata,
      async (chainName, metadata): Promise<ChainMetadata> => ({
        ...metadata,
        logoURI: `${links.imgPath}/chains/${chainName}/logo.svg`,
      }),
    ),
  );
  const mergedChainMetadata = mergeChainMetadataMap(registryChainMetadata, filesystemMetadata);

  const parsedRpcOverridesResult = tryParseJsonOrYaml(config.rpcOverrides);
  const rpcOverrides = z
    .record(RpcUrlSchema)
    .safeParse(parsedRpcOverridesResult.success && parsedRpcOverridesResult.data);
  if (config.rpcOverrides && !rpcOverrides.success) {
    logger.warn('Invalid RPC overrides config', rpcOverrides.error);
  }

  const chainMetadata = objMap(mergedChainMetadata, (chainName, metadata) => {
    const overridesUrl =
      rpcOverrides.success && rpcOverrides.data[chainName]
        ? rpcOverrides.data[chainName]
        : undefined;

    if (!overridesUrl) return metadata;

    // Only EVM supports fallback transport, so we are putting the override at the end
    const rpcUrls =
      metadata.protocol === ProtocolType.Ethereum
        ? [...metadata.rpcUrls, overridesUrl]
        : [overridesUrl, ...metadata.rpcUrls];

    return { ...metadata, rpcUrls };
  });

  const chainMetadataWithOverrides = mergeChainMetadataMap(chainMetadata, storeMetadataOverrides);
  return { chainMetadata, chainMetadataWithOverrides };
}
