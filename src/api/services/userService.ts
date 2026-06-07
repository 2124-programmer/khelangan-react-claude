import { Platform } from 'react-native';
import { apiClient } from '../client';
import type { UserDto, UpdateProfileRequest, ChangeRoleRequest, AuthResponse, Page, ImageUploadResponse } from '../types';

export const userService = {
  getMe: () =>
    apiClient.get<UserDto>('/api/v1/users/me').then((r) => r.data),

  updateMe: (data: UpdateProfileRequest) =>
    apiClient.put<UserDto>('/api/v1/users/me', data).then((r) => r.data),

  uploadAvatar: async (localUri: string) => {
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append('file', blob, 'avatar.jpg');
    } else {
      const filename = localUri.split('/').pop() ?? 'avatar.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: localUri, name: filename, type } as any);
    }
    return apiClient
      .post<ImageUploadResponse>('/api/v1/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

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
