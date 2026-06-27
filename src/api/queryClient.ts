import { QueryClient, QueryCache, MutationCache, onlineManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { extractApiError } from './client';
import { classifyError } from '../lib/errors';
import { toast } from '../toast';

function toastApiError(error: unknown, overrideMsg?: string): void {
  const msg = overrideMsg ?? extractApiError(error);
  toast.error(msg);
}

// Pause/resume fetching with device connectivity. When offline, TanStack Query holds fetches and
// resumes them automatically once NetInfo reports the connection is back.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    // NOTE: this global toast is the legacy signal for screens that have NOT yet adopted <QueryState>.
    // Screens that render an inline <ErrorState> (via QueryState) must opt out with
    // `meta: { suppressToast: true }` so a failed screen load is never double-reported.
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
      staleTime: 30_000,
      // Never retry a genuine auth failure (it won't change) or a 404 (deterministic). Everything
      // else — offline / unreachable / 5xx / unknown — is potentially transient, so retry up to 3x.
      retry: (failureCount, error) => {
        const kind = classifyError(error);
        if (kind === 'auth' || kind === 'notFound') return false;
        return failureCount < 3;
      },
      // Exponential backoff (1s, 2s, 4s, …) capped at 30s.
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      refetchOnWindowFocus: false,
    },
  },
});
