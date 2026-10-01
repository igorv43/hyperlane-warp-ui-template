import { useTimeout } from '@hyperlane-xyz/widgets';
import Image from 'next/image';
import { PropsWithChildren, useState } from 'react';
import { BackgroundFX } from '../components/layout/BackgroundFX';
import Logo from '../images/logos/app-logo.svg';
import { useReadyMultiProvider } from './chains/hooks';

const INIT_TIMEOUT = 10_000; // 10 seconds

// A wrapper app to delay rendering children until the warp context is ready
export function WarpContextInitGate({ children }: PropsWithChildren<unknown>) {
  const isWarpContextReady = !!useReadyMultiProvider();

  const [isTimedOut, setIsTimedOut] = useState(false);
  useTimeout(() => setIsTimedOut(true), INIT_TIMEOUT);

  if (!isWarpContextReady) {
    if (isTimedOut) {
      // Fallback to outer error boundary
      throw new Error(
        'Failed to initialize warp context. Please check your registry URL and connection status.',
      );
    } else {
      return (
        <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#050508]">
          <BackgroundFX />
          <div className="relative z-10 flex flex-col items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-accent-400/30 blur-xl" />
              <Image src={Logo} width={56} height={56} alt="" className="relative" priority />
            </div>
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-accent-400" />
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
