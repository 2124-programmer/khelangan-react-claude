import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { adaptBooking } from '../adapters';
import type { CreateBookingRequest } from '../types';

export const BOOKINGS_KEY = ['bookings'] as const;
export const ADMIN_BOOKINGS_KEY = ['admin', 'bookings'] as const;

export function useBookings(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: [...BOOKINGS_KEY, params],
    queryFn: async () => {
      const page = await bookingService.list(params);
      return {
        bookings: page.content.map(adaptBooking),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useBookingDetail(id: string | number | undefined) {
  const numId = Number(id);
  return useQuery({
    queryKey: [...BOOKINGS_KEY, numId],
    queryFn: () => bookingService.getById(numId).then(adaptBooking),
    enabled: !!id && !isNaN(numId) && numId > 0,
  });
}

export function useAdminBookings(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: [...ADMIN_BOOKINGS_KEY, params],
    queryFn: async () => {
      const page = await bookingService.listAdmin(params);
      return {
        bookings: page.content.map(adaptBooking),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBookingRequest) => bookingService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] }); // slot status changes after booking
    },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingService.cancel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOKINGS_KEY }),
  });
}
