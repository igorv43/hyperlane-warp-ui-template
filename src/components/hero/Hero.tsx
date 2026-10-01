import { ChainLogo } from '../icons/ChainLogo';

const PATH_CHAINS = [
  { chainName: 'terraclassic', label: 'Terra Classic' },
  { chainName: 'ethereum', label: 'Ethereum' },
  { chainName: 'solanamainnet', label: 'Solana' },
  { chainName: 'bsc', label: 'BNB Chain' },
];

export function Hero() {
  return (
    <div className="flex w-full flex-col items-center px-4 pb-2 pt-1 text-center sm:pb-4">
      <h1 className="max-w-xl text-2xl font-semibold leading-tight text-white sm:text-3xl">
        One bridge.{' '}
        <span className="bg-gradient-to-r from-accent-300 via-primary-300 to-accent-300 bg-clip-text text-transparent">
          Multiple chains.
        </span>
      </h1>
      <p className="mt-2.5 max-w-sm text-xs text-gray-400 sm:max-w-md sm:text-sm">
        Transfer assets from Terra Classic to Ethereum, Solana, and BNB Chain through
        trust-minimized, permissionless interchain infrastructure.
      </p>
      <ChainPath />
    </div>
  );
}

function ChainPath() {
  return (
    <div className="relative mt-6 flex w-full max-w-sm items-center justify-between sm:max-w-md">
      {/* connecting line */}
      <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-primary-400/60 via-accent-300/80 to-primary-400/60" />
      <div className="absolute left-5 right-5 top-1/2 h-px -translate-y-1/2 animate-pulse-slow bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      {PATH_CHAINS.map((c) => (
        <div key={c.chainName} className="relative z-10 flex flex-col items-center gap-1.5">
          <div className="rounded-full bg-[#050508] p-1 ring-1 ring-white/10">
            <div className="rounded-full shadow-[0_0_12px_rgba(95,222,201,0.35)]">
              <ChainLogo chainName={c.chainName} size={30} background />
            </div>
          </div>
          <span className="text-[0.65rem] text-gray-400 sm:text-xs">{c.label}</span>
        </div>
      ))}
    </div>
  );
}
