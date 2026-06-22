import { apiClient } from '../client';
import type {
  RegisterRequest, LoginRequest, OtpSendRequest, OtpSendResponse,
  OtpVerifyRequest, ForgotPasswordRequest, AuthResponse, MessageResponse,
  ChangePasswordRequest, PasswordResetRequest, PasswordResetVerifyRequest,
  PasswordResetVerifyResponse, PasswordResetConfirmRequest,
} from '../types';

const BASE = '/api/v1/auth';

export const authService = {
  register: (data: RegisterRequest) =>
    apiClient.post<AuthResponse>(`${BASE}/register`, data).then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<AuthResponse>(`${BASE}/login`, data).then((r) => r.data),

  sendOtp: (data: OtpSendRequest) =>
    apiClient.post<OtpSendResponse>(`${BASE}/otp/send`, data).then((r) => r.data),

  verifyOtp: (data: OtpVerifyRequest) =>
    apiClient.post<AuthResponse>(`${BASE}/otp/verify`, data).then((r) => r.data),

  forgotPassword: (data: ForgotPasswordRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/forgot-password`, data).then((r) => r.data),

  changePassword: (data: ChangePasswordRequest) =>
    apiClient.post<AuthResponse>(`${BASE}/change-password`, data).then((r) => r.data),

  requestPasswordReset: (data: PasswordResetRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/password-reset/request`, data).then((r) => r.data),

  verifyPasswordResetOtp: (data: PasswordResetVerifyRequest) =>
    apiClient.post<PasswordResetVerifyResponse>(`${BASE}/password-reset/verify`, data).then((r) => r.data),

  confirmPasswordReset: (data: PasswordResetConfirmRequest) =>
    apiClient.post<MessageResponse>(`${BASE}/password-reset/confirm`, data).then((r) => r.data),
};
