import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '../services/reviewService';
import { adaptReview } from '../adapters';
import type { CreateReviewRequest } from '../types';

export function venueReviewsKey(venueId: number) {
  return ['reviews', 'venue', venueId] as const;
}

export const OWNER_REVIEWS_KEY = ['owner', 'reviews'] as const;

export function useVenueReviews(venueId: string | number | undefined, params?: { page?: number }) {
  const id = Number(venueId);
  return useQuery({
    queryKey: [...venueReviewsKey(id), params],
    queryFn: async () => {
      const page = await reviewService.listByVenue(id, params);
      return {
        reviews: page.content.map(adaptReview),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
    enabled: !!venueId && !isNaN(id) && id > 0,
  });
}

export function useOwnerReviews(params?: { page?: number }) {
  return useQuery({
    queryKey: [...OWNER_REVIEWS_KEY, params],
    queryFn: async () => {
      const page = await reviewService.listOwner(params);
      return {
        reviews: page.content.map(adaptReview),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateReviewRequest) => reviewService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      qc.invalidateQueries({ queryKey: ['bookings'] }); // hasReview flag changes
    },
  });
}
