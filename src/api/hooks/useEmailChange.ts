import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailChangeService } from '../services/emailChangeService';
import type { EmailChangeCreateRequest, EmailChangeVerifyRequest } from '../types';

const KEY = ['emailChangeStatus'] as const;

export function useEmailChangeStatus() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => emailChangeService.getStatus().catch((err) => {
      if (err?.response?.status === 204) return null;
      throw err;
    }),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreateEmailChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailChangeCreateRequest) => emailChangeService.createRequest(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVerifyEmailChangeOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: EmailChangeVerifyRequest) => emailChangeService.verifyOtp(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
