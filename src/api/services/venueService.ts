import { Platform } from 'react-native';
import { apiClient } from '../client';
import type {
  VenueSummaryDto, VenueDetailDto, CreateVenueRequest,
  UpdateVenueRequest, VenueStatusRequest, Page, ImageUploadResponse,
  AdminVenueDetailDto, SubmitVenueRequest, VenueCountsDto,
} from '../types';

export const venueService = {
  // Public — no token required
  list: (params?: { city?: string; sport?: string; search?: string; page?: number; size?: number }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/venues', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<VenueDetailDto>(`/api/v1/venues/${id}`).then((r) => r.data),

  // Owner
  create: (data: CreateVenueRequest) =>
    apiClient.post<VenueDetailDto>('/api/v1/venues', data).then((r) => r.data),

  update: (id: number, data: UpdateVenueRequest) =>
    apiClient.put<VenueDetailDto>(`/api/v1/venues/${id}`, data).then((r) => r.data),

  listOwner: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/owner/venues', { params }).then((r) => r.data),

  // Owner — submit/resubmit a venue for approval (DRAFT|CHANGES_REQUESTED → PENDING).
  // planId is required only when the venue has >2 courts.
  submit: (venueId: number, data?: SubmitVenueRequest) =>
    apiClient.post<VenueDetailDto>(`/api/v1/owner/venues/${venueId}/submit`, data ?? {}).then((r) => r.data),

  // Image upload (Owner) — sends multipart/form-data, returns { url }
  uploadImage: async (localUri: string) => {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // On web, expo-image-manipulator returns a data: URI (base64).
      // Browsers require a real Blob — fetch() converts it for us.
      const response = await fetch(localUri);
      const blob = await response.blob();
      formData.append('file', blob, 'photo.jpg');
    } else {
      // React Native native: FormData accepts { uri, name, type } directly.
      const filename = localUri.split('/').pop() ?? 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      formData.append('file', { uri: localUri, name: filename, type } as any);
    }

    return apiClient
      .post<ImageUploadResponse>('/api/v1/venues/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  // Admin
  listAdmin: (params?: { page?: number; size?: number; status?: string; q?: string }) =>
    apiClient.get<Page<VenueSummaryDto>>('/api/v1/admin/venues', { params }).then((r) => r.data),

  countsAdmin: () =>
    apiClient.get<VenueCountsDto>('/api/v1/admin/venues/counts').then((r) => r.data),

  // Admin — full detail (any status) + owner context, for the approval review screen
  getAdminById: (id: number) =>
    apiClient.get<AdminVenueDetailDto>(`/api/v1/admin/venues/${id}`).then((r) => r.data),

  updateStatus: (id: number, data: VenueStatusRequest) =>
    apiClient.patch<VenueDetailDto>(`/api/v1/venues/${id}/status`, data).then((r) => r.data),
};
