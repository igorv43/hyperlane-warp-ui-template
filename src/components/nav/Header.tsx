import Image from 'next/image';
import Link from 'next/link';
import { ConnectWalletButton } from '../../features/wallet/ConnectWalletButton';
import Logo from '../../images/logos/app-logo.svg';

export function Header() {
  return (
    <header className="w-full px-3 pb-2 pt-4 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="group flex items-center gap-3 py-1">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full bg-accent-400/40 opacity-60 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
            <Image
              src={Logo}
              width={40}
              height={40}
              alt="Terra Classic Bridge"
              priority
              className="relative transition-transform duration-700 ease-out group-hover:rotate-[18deg]"
            />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-lg font-semibold tracking-tight text-white sm:text-xl">
              Terra Classic
            </span>
            <span className="bg-gradient-to-r from-accent-300 via-primary-300 to-accent-300 bg-clip-text text-xs font-medium uppercase tracking-[0.28em] text-transparent sm:text-sm">
              Bridge
            </span>
          </div>
        </Link>
        <div className="connect-wallet-dark connect-wallet-wrapper flex flex-col items-end gap-2 md:flex-row-reverse md:items-start">
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}
