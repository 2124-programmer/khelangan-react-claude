import '@tanstack/react-query';

interface ToastMeta {
  /**
   * Set true on a useMutation / useQuery whose errors are handled by custom UI
   * (a modal phase, an inline field error, etc.) to prevent the global
   * MutationCache / QueryCache onError handler from also showing a toast.
   */
  suppressToast?: boolean;
  /** Override the toast message extracted from the server error envelope. */
  errorMessage?: string;
}

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: ToastMeta;
    queryMeta: ToastMeta;
  }
}
