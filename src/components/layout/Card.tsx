import { PropsWithChildren } from 'react';

interface Props {
  className?: string;
}

export function Card({ className, children }: PropsWithChildren<Props>) {
  return (
    <div
      className={`relative overflow-auto rounded-2xl bg-white p-1.5 shadow-xl shadow-black/30 ring-1 ring-white/10 xs:p-2 sm:p-3 md:p-4 ${className}`}
    >
      {children}
    </div>
  );
}
