import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../services/adminService';
import { ME_KEY, ADMIN_USERS_KEY } from './useUser';
import type { AdminRoleValue, CreateAdminRequest, PromoteAdminRequest, RemoveAdminMode } from '../types';

export const ADMIN_ROLES_KEY = ['admin', 'admins'] as const;
export const SYSTEM_INFO_KEY = ['admin', 'system-info'] as const;

/** Super-admin only: non-sensitive app configuration / runtime snapshot. */
export function useSystemInfo() {
  return useQuery({
    queryKey: SYSTEM_INFO_KEY,
    queryFn: () => adminService.getSystemInfo(),
    meta: { suppressToast: true }, // screen shows an inline ErrorState via QueryState
  });
}

/** Super-admin only: list all admins with their effective sub-role. */
export function useAdmins() {
  return useQuery({
    queryKey: ADMIN_ROLES_KEY,
    queryFn: () => adminService.listAdmins(),
    // The screen shows an inline ErrorState (via QueryState); don't also fire the global toast.
    meta: { suppressToast: true },
  });
}

/** Super-admin only: change another admin's sub-role. */
export function useSetAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    // Screen surfaces the specific server message itself; don't also fire the global toast.
    meta: { suppressToast: true },
    mutationFn: ({ id, adminRole }: { id: number; adminRole: AdminRoleValue }) =>
      adminService.setAdminRole(id, adminRole),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      // The actor could have changed their own role — refresh the session user too.
      qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}

/** Super-admin only: create a brand-new admin account. */
export function useCreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressToast: true },
    mutationFn: (data: CreateAdminRequest) => adminService.createAdmin(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

/** Super-admin only: promote an existing user to admin by email. */
export function usePromoteToAdmin() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressToast: true },
    mutationFn: (data: PromoteAdminRequest) => adminService.promoteToAdmin(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
    },
  });
}

/** Super-admin only: remove an admin — demote to player or deactivate the account. */
export function useRemoveAdmin() {
  const qc = useQueryClient();
  return useMutation({
    meta: { suppressToast: true },
    mutationFn: ({ id, mode }: { id: number; mode: RemoveAdminMode }) =>
      adminService.removeAdmin(id, mode),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_ROLES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      // A super-admin could remove themselves only via guard-bypass; refresh session just in case.
      qc.invalidateQueries({ queryKey: ME_KEY });
    },
  });
}
