import { apiClient } from '../client';
import type { UserDto, UpdateProfileRequest, ChangeRoleRequest, AuthResponse, Page } from '../types';

export const userService = {
  getMe: () =>
    apiClient.get<UserDto>('/api/v1/users/me').then((r) => r.data),

  updateMe: (data: UpdateProfileRequest) =>
    apiClient.put<UserDto>('/api/v1/users/me', data).then((r) => r.data),

  changeRole: (data: ChangeRoleRequest) =>
    apiClient.patch<AuthResponse>('/api/v1/users/me/role', data).then((r) => r.data),

  // Admin
  listAdmin: (params?: { page?: number; size?: number; role?: string; search?: string }) =>
    apiClient.get<Page<UserDto>>('/api/v1/admin/users', { params }).then((r) => r.data),

  block: (id: number) =>
    apiClient.patch<UserDto>(`/api/v1/admin/users/${id}/block`).then((r) => r.data),

  unblock: (id: number) =>
    apiClient.patch<UserDto>(`/api/v1/admin/users/${id}/unblock`).then((r) => r.data),
};
