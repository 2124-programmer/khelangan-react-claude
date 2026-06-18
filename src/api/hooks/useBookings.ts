import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import { adaptBooking } from '../adapters';
import type { BulkCreateBookingRequest, CreateBookingRequest } from '../types';

export const BOOKINGS_KEY = ['bookings'] as const;
export const ADMIN_BOOKINGS_KEY = ['admin', 'bookings'] as const;

export function useBookings(
  params?: { status?: string; date?: string; dateFrom?: string; page?: number; size?: number },
  options?: { enabled?: boolean }
) {
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
    enabled: options?.enabled ?? true,
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
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useBulkCreateBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkCreateBookingRequest) => bookingService.bulkCreate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] });
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

export function useCancelBookingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => bookingService.cancelGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAcceptBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingService.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRejectBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingService.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useAcceptBookingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => bookingService.acceptGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRejectBookingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => bookingService.rejectGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useCheckInBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookingService.checkIn(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}

export function useCheckInBookingGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId: string) => bookingService.checkInGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: BOOKINGS_KEY });
      qc.invalidateQueries({ queryKey: ['slots'] });
    },
  });
}
