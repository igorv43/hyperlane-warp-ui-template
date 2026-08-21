/**
 * Hook que cota a taxa administrativa da chain de ORIGEM em tempo real, para exibir
 * ao usuário antes do envio. Atualiza a cada 20s (preço vivo da Binance).
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
