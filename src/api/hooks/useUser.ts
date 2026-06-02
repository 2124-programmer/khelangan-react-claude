import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/userService';
import { adaptUser } from '../adapters';
import type { UpdateProfileRequest } from '../types';

export const ME_KEY = ['users', 'me'] as const;
export const ADMIN_USERS_KEY = ['admin', 'users'] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_KEY,
    queryFn: () => userService.getMe().then(adaptUser),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => userService.updateMe(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ME_KEY }),
  });
}

export function useAdminUsers(params?: { page?: number; role?: string; search?: string }) {
  return useQuery({
    queryKey: [...ADMIN_USERS_KEY, params],
    queryFn: async () => {
      const page = await userService.listAdmin(params);
      return {
        users: page.content.map(adaptUser),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userService.block(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}

export function useUnblockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => userService.unblock(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY }),
  });
}
