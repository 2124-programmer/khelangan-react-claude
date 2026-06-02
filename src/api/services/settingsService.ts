import { apiClient } from '../client';
import type { OwnerSettingsDto, UpdateOwnerSettingsRequest } from '../types';

export const settingsService = {
  get: () =>
    apiClient.get<OwnerSettingsDto>('/api/v1/owner/settings').then((r) => r.data),

  update: (data: UpdateOwnerSettingsRequest) =>
    apiClient.put<OwnerSettingsDto>('/api/v1/owner/settings', data).then((r) => r.data),
};
