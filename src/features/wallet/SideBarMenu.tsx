import { AccountList, SpinnerIcon } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { ChainLogo } from '../../components/icons/ChainLogo';
import ArrowRightIcon from '../../images/icons/arrow-right.svg';
import CollapseIcon from '../../images/icons/collapse-icon.svg';
import ResetIcon from '../../images/icons/reset-icon.svg';
import { useMultiProvider } from '../chains/hooks';
import { getChainDisplayName } from '../chains/utils';
import { useStore } from '../store';
import { tryFindToken, useWarpCore } from '../tokens/hooks';
import { TransfersDetailsModal } from '../transfer/TransfersDetailsModal';
import { TransferContext } from '../transfer/types';
import { getIconByTransferStatus, STATUSES_WITH_ICON } from '../transfer/utils';

export function SideBarMenu({
  onClickConnectWallet,
  isOpen,
  onClose,
}: {
  onClickConnectWallet: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const didMountRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferContext | null>(null);

  const multiProvider = useMultiProvider();

  const { transfers, resetTransfers, transferLoading, originChainName } = useStore((s) => ({
    transfers: s.transfers,
    resetTransfers: s.resetTransfers,
    transferLoading: s.transferLoading,
    originChainName: s.originChainName,
  }));

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
    } else if (transferLoading) {
      setSelectedTransfer(transfers[transfers.length - 1]);
      setIsModalOpen(true);
    }
  }, [transfers, transferLoading]);

  useEffect(() => {
    setIsMenuOpen(isOpen);
  }, [isOpen]);

  const sortedTransfers = useMemo(
    () => [...transfers].sort((a, b) => b.timestamp - a.timestamp) || [],
    [transfers],
  );

  const onCopySuccess = () => {
    toast.success('Address copied to clipboard', { autoClose: 2000 });
  };

  return (
    <>
      <div
        className={`fixed right-0 top-0 z-20 h-full w-full max-w-[22rem] transform border-l border-white/10 bg-[#0a0a0f]/95 shadow-2xl backdrop-blur-2xl transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {isMenuOpen && (
          <button
            className="absolute left-0 top-0 hidden h-full w-9 -translate-x-full items-center justify-center rounded-l-md bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 sm:flex"
            onClick={() => onClose()}
          >
            <Image src={CollapseIcon} width={15} height={24} alt="" className="invert" />
          </button>
        )}
        <div className="flex h-full w-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 text-base font-medium tracking-wide text-white sm:hidden">
            <span>Menu</span>
            <button
              onClick={() => onClose()}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="w-full bg-gradient-to-r from-primary-600/40 to-accent-600/40 px-3.5 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-gray-200">
            Connected Wallets
          </div>
          <AccountList
            multiProvider={multiProvider}
            onClickConnectWallet={onClickConnectWallet}
            onCopySuccess={onCopySuccess}
            className="px-3 py-3"
            chainName={originChainName}
          />
          <div className="mb-4 w-full bg-gradient-to-r from-primary-600/40 to-accent-600/40 px-3.5 py-2.5 text-sm font-medium uppercase tracking-[0.2em] text-gray-200">
            Transfer History
          </div>
          <div className="flex grow flex-col px-3.5">
            <div className="flex w-full grow flex-col divide-y divide-white/10">
              {sortedTransfers?.length > 0 &&
                sortedTransfers.map((t, i) => (
                  <TransferSummary
                    key={i}
                    transfer={t}
                    onClick={() => {
                      setSelectedTransfer(t);
                      setIsModalOpen(true);
                    }}
                  />
                ))}
              {sortedTransfers?.length === 0 && (
                <div className="py-10 text-center text-sm text-gray-500">No transfers yet</div>
              )}
            </div>
            {sortedTransfers?.length > 0 && (
              <button onClick={resetTransfers} className={`${styles.btn} mx-2 my-5`}>
                <Image className="mr-4 opacity-70" src={ResetIcon} width={17} height={17} alt="" />
                <span className="text-sm font-normal text-gray-300">Reset transaction history</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {selectedTransfer && (
        <TransfersDetailsModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedTransfer(null);
          }}
          transfer={selectedTransfer}
        />
      )}
    </>
  );
}

function TransferSummary({
  transfer,
  onClick,
}: {
  transfer: TransferContext;
  onClick: () => void;
}) {
  const multiProvider = useMultiProvider();
  const warpCore = useWarpCore();

  const { amount, origin, destination, status, timestamp, originTokenAddressOrDenom } = transfer;

  const token = tryFindToken(warpCore, origin, originTokenAddressOrDenom);

  return (
    <button key={timestamp} onClick={onClick} className={`${styles.btn} justify-between py-3`}>
      <div className="flex gap-2.5">
        <div className="flex h-[2.25rem] w-[2.25rem] flex-col items-center justify-center rounded-full bg-white/10 px-1.5">
          <ChainLogo chainName={origin} size={20} />
        </div>
        <div className="flex flex-col">
          <div className="flex flex-col">
            <div className="items flex items-baseline">
              <span className="text-sm font-normal text-white">{amount}</span>
              <span className="ml-1 text-sm font-normal text-white">{token?.symbol || ''}</span>
            </div>
            <div className="mt-1 flex flex-row items-center">
              <span className="text-xxs font-normal tracking-wide text-gray-400">
                {getChainDisplayName(multiProvider, origin, true)}
              </span>
              <Image className="mx-1 opacity-60" src={ArrowRightIcon} width={10} height={10} alt="" />
              <span className="text-xxs font-normal tracking-wide text-gray-400">
                {getChainDisplayName(multiProvider, destination, true)}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex h-5 w-5">
        {STATUSES_WITH_ICON.includes(status) ? (
          <Image src={getIconByTransferStatus(status)} width={25} height={25} alt="" />
        ) : (
          <SpinnerIcon className="-ml-1 mr-3 h-5 w-5" />
        )}
      </div>
    </button>
  );
}

const styles = {
  btn: 'w-full flex items-center px-1 py-2 text-sm hover:bg-white/10 active:scale-95 transition-all duration-500 cursor-pointer rounded-sm',
};
