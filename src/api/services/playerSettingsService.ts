import { apiClient } from '../client';
import type { PlayerSettingsDto, UpdatePlayerSettingsRequest } from '../types';

export const playerSettingsService = {
  get: () =>
    apiClient.get<PlayerSettingsDto>('/api/v1/player/settings').then((r) => r.data),

  update: (data: UpdatePlayerSettingsRequest) =>
    apiClient.put<PlayerSettingsDto>('/api/v1/player/settings', data).then((r) => r.data),
};
