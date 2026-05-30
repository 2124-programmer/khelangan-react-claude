import { apiClient } from '../client';
import type { BookingDto, CreateBookingRequest, Page } from '../types';

export const bookingService = {
  // Role-scoped: player sees own, owner sees venue bookings, admin sees all
  list: (params?: { status?: string; page?: number; size?: number }) =>
    apiClient.get<Page<BookingDto>>('/api/v1/bookings', { params }).then((r) => r.data),

  getById: (id: number) =>
    apiClient.get<BookingDto>(`/api/v1/bookings/${id}`).then((r) => r.data),

  create: (data: CreateBookingRequest) =>
    apiClient.post<BookingDto>('/api/v1/bookings', data).then((r) => r.data),

  cancel: (id: number) =>
    apiClient.patch<BookingDto>(`/api/v1/bookings/${id}/cancel`).then((r) => r.data),

  // Admin only
  listAdmin: (params?: { status?: string; page?: number; size?: number }) =>
    apiClient.get<Page<BookingDto>>('/api/v1/admin/bookings', { params }).then((r) => r.data),
};
