import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { playerSettingsService } from '../services/playerSettingsService';
import type { PlayerSettingsDto, UpdatePlayerSettingsRequest } from '../types';

export const PLAYER_SETTINGS_KEY = ['player', 'settings'] as const;

const DEFAULTS: PlayerSettingsDto = {
  pushNotificationsEnabled: true,
  emailNotificationsEnabled: true,
};

export function usePlayerSettings() {
  return useQuery({
    queryKey: PLAYER_SETTINGS_KEY,
    queryFn: () => playerSettingsService.get(),
  });
}

export function useUpdatePlayerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePlayerSettingsRequest) => playerSettingsService.update(data),
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: PLAYER_SETTINGS_KEY });
      const previous = qc.getQueryData<PlayerSettingsDto>(PLAYER_SETTINGS_KEY);
      qc.setQueryData<PlayerSettingsDto>(PLAYER_SETTINGS_KEY, (old) => ({
        ...DEFAULTS,
        ...old,
        ...variables,
      }));
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous !== undefined) {
        qc.setQueryData(PLAYER_SETTINGS_KEY, context.previous);
      }
    },
    onSettled: () => qc.invalidateQueries({ queryKey: PLAYER_SETTINGS_KEY }),
  });
}
