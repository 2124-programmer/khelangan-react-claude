import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { venueService } from '../services/venueService';
import { adaptVenueSummary, adaptVenueDetail } from '../adapters';
import type { CreateVenueRequest, UpdateVenueRequest, VenueStatusRequest } from '../types';

export const VENUES_KEY = ['venues'] as const;
export const OWNER_VENUES_KEY = ['owner', 'venues'] as const;
export const ADMIN_VENUES_KEY = ['admin', 'venues'] as const;

export function useVenues(params?: { city?: string; sport?: string; search?: string; page?: number }) {
  return useQuery({
    queryKey: [...VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.list(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useVenueDetail(venueId: string | number | undefined) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...VENUES_KEY, id],
    queryFn: () => venueService.getById(id).then(adaptVenueDetail),
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

export function useOwnerVenues(params?: { page?: number }) {
  return useQuery({
    queryKey: [...OWNER_VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.listOwner(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useAdminVenues(params?: { page?: number; status?: string }) {
  return useQuery({
    queryKey: [...ADMIN_VENUES_KEY, params],
    queryFn: async () => {
      const page = await venueService.listAdmin(params);
      return {
        venues: page.content.map(adaptVenueSummary),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useCreateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVenueRequest) => venueService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENUES_KEY });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
    },
  });
}

export function useUpdateVenue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVenueRequest }) =>
      venueService.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: [...VENUES_KEY, id] });
      qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
    },
  });
}

export function useUpdateVenueStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: VenueStatusRequest }) =>
      venueService.updateStatus(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: VENUES_KEY });
      qc.invalidateQueries({ queryKey: ADMIN_VENUES_KEY });
    },
  });
}
