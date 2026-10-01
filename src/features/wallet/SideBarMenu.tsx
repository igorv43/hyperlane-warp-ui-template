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
      {/* Backdrop: click-away-to-close, also makes the open panel read as a layer
          instead of a wall suddenly covering the screen with no obvious way out. */}
      <div
        aria-hidden
        onClick={() => onClose()}
        className={`fixed inset-0 z-10 bg-black/60 backdrop-blur-[2px] transition-opacity duration-300 ease-in-out ${
          isMenuOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <div
        className={`fixed right-0 top-0 z-20 h-full w-full max-w-[22rem] transform border-l border-white/10 bg-[#07070c]/90 shadow-[0_0_60px_rgba(0,0,0,0.7)] backdrop-blur-2xl transition-transform duration-300 ease-in-out ${
          isMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Ambient glow accents, clipped to the panel only so they don't swallow
            the collapse arrow, which intentionally sits outside the left edge. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary-500/20 blur-[90px]" />
          <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-accent-400/20 blur-[100px]" />
        </div>
        {isMenuOpen && (
          <button
            className="absolute left-0 top-0 hidden h-full w-9 -translate-x-full items-center justify-center rounded-l-md bg-white/10 backdrop-blur-md transition-all hover:bg-white/20 sm:flex"
            onClick={() => onClose()}
          >
            <Image src={CollapseIcon} width={15} height={24} alt="" className="invert" />
          </button>
        )}
        <div className="relative z-10 flex h-full w-full flex-col overflow-y-auto">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3.5 text-base font-medium tracking-wide text-white sm:hidden">
            <span>Menu</span>
            <button
              onClick={() => onClose()}
              className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-5 p-3.5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_30px_rgba(124,110,234,0.08)] backdrop-blur-xl">
              <SectionLabel>Connected Wallets</SectionLabel>
              <AccountList
                multiProvider={multiProvider}
                onClickConnectWallet={onClickConnectWallet}
                onCopySuccess={onCopySuccess}
                className="px-2.5 pb-2.5 pt-1"
                chainName={originChainName}
              />
            </section>

            <section className="flex grow flex-col rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_0_30px_rgba(47,205,178,0.08)] backdrop-blur-xl">
              <SectionLabel>Transfer History</SectionLabel>
              <div className="flex grow flex-col gap-1.5 px-2.5 pb-2.5 pt-1">
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
                {sortedTransfers?.length > 0 && (
                  <button onClick={resetTransfers} className={`${styles.btn} mt-1`}>
                    <Image className="mr-4 opacity-70" src={ResetIcon} width={17} height={17} alt="" />
                    <span className="text-sm font-normal text-gray-300">
                      Reset transaction history
                    </span>
                  </button>
                )}
              </div>
            </section>
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
    <button
      key={timestamp}
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-2.5 py-3 text-sm transition-all duration-300 hover:border-white/15 hover:bg-white/[0.07] hover:shadow-[0_0_20px_rgba(124,110,234,0.15)] active:scale-[0.98]"
    >
      <div className="flex gap-2.5">
        <div className="flex h-[2.25rem] w-[2.25rem] flex-col items-center justify-center rounded-full bg-white/10 px-1.5 ring-1 ring-white/10">
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

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 px-3.5 pt-3">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400 shadow-[0_0_8px_2px_rgba(47,205,178,0.7)]" />
      <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-300">
        {children}
      </span>
      <span className="h-px grow bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

const styles = {
  btn: 'w-full flex items-center px-2.5 py-2.5 text-sm rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.07] active:scale-[0.98] transition-all duration-300 cursor-pointer',
};
