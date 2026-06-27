import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { phoneChangeService } from '../services/phoneChangeService';
import { ME_KEY } from './useUser';
import type { PhoneChangeCreateRequest, PhoneChangeVerifyRequest } from '../types';

const KEY = ['phoneChangeStatus'] as const;

export function usePhoneChangeStatus() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => phoneChangeService.getStatus().catch((err) => {
      if (err?.response?.status === 204) return null;
      throw err;
    }),
    staleTime: 30_000,
    retry: false,
  });
}

export function useCreatePhoneChangeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PhoneChangeCreateRequest) => phoneChangeService.createRequest(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVerifyPhoneChangeOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PhoneChangeVerifyRequest) => phoneChangeService.verifyOtp(data),
    onSuccess: () => {
      // Self-service verify applies the change immediately — refresh the request status AND the
      // cached current-user profile so screens like Profile show the new phone at once.
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
