import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { adaptOwnerSettings } from '../adapters';
import type { OwnerSettings } from '../../types';
import type { UpdateOwnerSettingsRequest } from '../types';

export const OWNER_SETTINGS_KEY = ['owner', 'settings'] as const;

export function useOwnerSettings() {
  return useQuery({
    queryKey: OWNER_SETTINGS_KEY,
    queryFn: () => settingsService.get().then(adaptOwnerSettings),
  });
}

export function useUpdateOwnerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateOwnerSettingsRequest) => settingsService.update(data),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: OWNER_SETTINGS_KEY });
      const previous = qc.getQueryData<OwnerSettings>(OWNER_SETTINGS_KEY);
      qc.setQueryData<OwnerSettings>(OWNER_SETTINGS_KEY, (old) => ({
        autoAcceptBookings: old?.autoAcceptBookings ?? false,
        pushNotificationsEnabled: old?.pushNotificationsEnabled ?? true,
        ...variables,
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(OWNER_SETTINGS_KEY, context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: OWNER_SETTINGS_KEY }),
  });
}
