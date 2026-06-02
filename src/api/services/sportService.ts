import { apiClient } from '../client';
import type { SportDto, CreateSportRequest, UpdateSportRequest } from '../types';

export const sportService = {
  list: () =>
    apiClient.get<SportDto[]>('/api/v1/sports').then((r) => r.data),

  create: (data: CreateSportRequest) =>
    apiClient.post<SportDto>('/api/v1/admin/sports', data).then((r) => r.data),

  update: (id: number, data: UpdateSportRequest) =>
    apiClient.put<SportDto>(`/api/v1/admin/sports/${id}`, data).then((r) => r.data),

  delete: (id: number) =>
    apiClient.delete(`/api/v1/admin/sports/${id}`),
};
