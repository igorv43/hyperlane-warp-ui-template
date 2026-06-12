import { ChainMap, ChainMetadata } from '@hyperlane-xyz/sdk';
import { objFilter } from '@hyperlane-xyz/utils';
import { ChainSearchMenu, ChainSearchMenuProps, Modal } from '@hyperlane-xyz/widgets';
import { useMemo } from 'react';
import { config } from '../../consts/config';
import { useStore } from '../store';

/**
 * Filters chain metadata to include only chains with specified domainIds.
 *
 * @param chainMetadata - The full chain metadata map
 * @param allowedDomainIds - Array of domainIds to allow (e.g., [8453, 478] for base and form)
 * @returns Filtered ChainMap containing only chains with matching domainIds
 */
function filterChainMetadataByDomainId(
  chainMetadata: ChainMap<ChainMetadata>,
  allowedDomainIds: number[],
): ChainMap<ChainMetadata> {
  if (!allowedDomainIds || allowedDomainIds.length === 0) {
    return chainMetadata;
  }

  const allowedDomainIdSet = new Set(allowedDomainIds);

  return objFilter(chainMetadata, (chainName, metadata): metadata is ChainMetadata => {
    return metadata?.domainId !== undefined && allowedDomainIdSet.has(metadata.domainId);
  });
}

/**
 * Filters chain metadata to include only chains that participate in a warp route.
 *
 * @param chainMetadata - The full chain metadata map
 * @param warpChainNames - Set of chain names present in the assembled WarpCore
 * @returns Filtered ChainMap containing only chains that have a warp route token
 */
function filterChainMetadataByWarpRoutes(
  chainMetadata: ChainMap<ChainMetadata>,
  warpChainNames: Set<string>,
): ChainMap<ChainMetadata> {
  return objFilter(chainMetadata, (chainName, metadata): metadata is ChainMetadata => {
    return warpChainNames.has(chainName);
  });
}

export function ChainSelectListModal({
  isOpen,
  close,
  onSelect,
  customListItemField,
  showChainDetails,
}: {
  isOpen: boolean;
  close: () => void;
  onSelect: (chain: ChainName) => void;
  customListItemField?: ChainSearchMenuProps['customListItemField'];
  showChainDetails?: ChainSearchMenuProps['showChainDetails'];
}) {
  const { chainMetadata, chainMetadataOverrides, setChainMetadataOverrides, warpCore } = useStore(
    (s) => ({
      chainMetadata: s.chainMetadata,
      chainMetadataOverrides: s.chainMetadataOverrides,
      setChainMetadataOverrides: s.setChainMetadataOverrides,
      warpCore: s.warpCore,
    }),
  );

  // Only show chains that participate in a warp route (present in the WarpCore tokens).
  // This prevents registry chains without a warp route (e.g. ENI) from appearing.
  const warpChainNames = useMemo(
    () => new Set(warpCore.tokens.map((token) => token.chainName)),
    [warpCore],
  );
  const warpFilteredChainMetadata = useMemo(
    () => filterChainMetadataByWarpRoutes(chainMetadata, warpChainNames),
    [chainMetadata, warpChainNames],
  );

  // Filter chains by domainId from config (if configured)
  const allowedDomainIds = config.allowedChainDomainIds;
  const filteredChainMetadata = allowedDomainIds
    ? filterChainMetadataByDomainId(warpFilteredChainMetadata, allowedDomainIds)
    : warpFilteredChainMetadata;

 const onSelectChain = (chain: ChainMetadata) => {
   onSelect(chain.name);
   close();
 };
  return (
    <Modal isOpen={isOpen} close={close} panelClassname="p-4 sm:p-5 max-w-lg min-h-[40vh]">
      <ChainSearchMenu
        chainMetadata={filteredChainMetadata}
        onClickChain={onSelectChain}
        overrideChainMetadata={chainMetadataOverrides}
        onChangeOverrideMetadata={setChainMetadataOverrides}
        customListItemField={customListItemField}
        defaultSortField="custom"
        showChainDetails={showChainDetails}
        shouldDisableChains={config.shouldDisableChains}
        showAddChainButton={config.showAddChainButton}
      />
    </Modal>
  );
}
