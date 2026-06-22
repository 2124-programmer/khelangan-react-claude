import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/authService';
import type {
  PasswordResetRequest, PasswordResetVerifyRequest, PasswordResetConfirmRequest,
  ChangePasswordRequest,
} from '../types';

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordRequest) => authService.changePassword(data),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetRequest) => authService.requestPasswordReset(data),
  });
}

export function useVerifyPasswordResetOtp() {
  return useMutation({
    mutationFn: (data: PasswordResetVerifyRequest) => authService.verifyPasswordResetOtp(data),
  });
}

export function useConfirmPasswordReset() {
  return useMutation({
    mutationFn: (data: PasswordResetConfirmRequest) => authService.confirmPasswordReset(data),
  });
}
