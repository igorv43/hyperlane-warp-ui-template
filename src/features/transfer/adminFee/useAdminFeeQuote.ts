/**
 * Hook that quotes the ORIGIN chain's administrative fee in real time, to display
 * to the user before sending. Refreshes every 20s (live Binance price).
 */
import { useQuery } from '@tanstack/react-query';
import { getAdminFeeChain } from '../../../consts/adminFee';
import { quoteAdminFee } from './quote';

const REFRESH_MS = 20_000;

export function useAdminFeeQuote(originChainName?: string) {
  const enabled = !!getAdminFeeChain(originChainName);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminFeeQuote', originChainName],
    queryFn: () => quoteAdminFee(originChainName),
    enabled,
    staleTime: REFRESH_MS,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
  });
  return { feeQuote: data ?? null, isLoading, isError, enabled };
}
