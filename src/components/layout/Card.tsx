import { PropsWithChildren } from 'react';

interface Props {
  className?: string;
}

export function Card({ className, children }: PropsWithChildren<Props>) {
  return (
    <div
      className={`relative overflow-auto rounded-2xl border border-white/15 bg-white/[0.04] p-1.5 text-white shadow-[0_0_40px_rgba(124,110,234,0.12),0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl xs:p-2 sm:p-3 md:p-4 ${className}`}
    >
      {children}
    </div>
  );
}
