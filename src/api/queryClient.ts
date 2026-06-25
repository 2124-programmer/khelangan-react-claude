import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { getHttpStatus, extractApiError } from './client';
import { toast } from '../toast';

function toastApiError(error: unknown, overrideMsg?: string): void {
  const msg = overrideMsg ?? extractApiError(error);
  toast.error(msg);
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.suppressToast) return;
      toastApiError(error, query.meta?.errorMessage as string | undefined);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.suppressToast) return;
      toastApiError(error, mutation.meta?.errorMessage as string | undefined);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 min
      retry: (failureCount, error) => {
        const status = getHttpStatus(error);
        if (status !== null && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
  },
});
