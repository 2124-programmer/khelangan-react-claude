import { apiClient } from '../client';
import type { CourtDto, CreateCourtRequest, UpdateCourtRequest } from '../types';

export const courtService = {
  list: (venueId: number) =>
    apiClient
      .get<CourtDto[]>(`/api/v1/venues/${venueId}/courts`)
      .then((r) => r.data),

  create: (venueId: number, data: CreateCourtRequest) =>
    apiClient
      .post<CourtDto>(`/api/v1/venues/${venueId}/courts`, data)
      .then((r) => r.data),

  update: (venueId: number, courtId: number, data: UpdateCourtRequest) =>
    apiClient
      .put<CourtDto>(`/api/v1/venues/${venueId}/courts/${courtId}`, data)
      .then((r) => r.data),

  delete: (venueId: number, courtId: number) =>
    apiClient
      .delete<void>(`/api/v1/venues/${venueId}/courts/${courtId}`)
      .then((r) => r.data),
};
