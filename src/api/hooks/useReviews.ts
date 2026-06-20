import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewService } from '../services/reviewService';
import { adaptReview } from '../adapters';
import { VENUES_KEY, OWNER_VENUES_KEY } from './useVenues';
import { useAuth } from '../../store/AuthContext';
import type { CreateReviewRequest, UpdateReviewRequest } from '../types';

export function venueReviewsKey(venueId: number) {
  return ['reviews', 'venue', venueId] as const;
}

export function myVenueReviewKey(venueId: number) {
  return ['reviews', 'mine', venueId] as const;
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

export function useMyVenueReview(venueId: string | number | undefined) {
  const { isLoggedIn } = useAuth();
  const id = Number(venueId);
  return useQuery({
    queryKey: myVenueReviewKey(id),
    queryFn: async () => {
      const dto = await reviewService.getMyReview(id);
      return dto ? adaptReview(dto) : null;
    },
    enabled: isLoggedIn && !!venueId && !isNaN(id) && id > 0,
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

function invalidateAfterReviewMutation(
  qc: ReturnType<typeof useQueryClient>,
  venueId: number,
) {
  qc.invalidateQueries({ queryKey: venueReviewsKey(venueId) });
  qc.invalidateQueries({ queryKey: myVenueReviewKey(venueId) });
  qc.invalidateQueries({ queryKey: [...VENUES_KEY, venueId] });
  qc.invalidateQueries({ queryKey: VENUES_KEY });
  qc.invalidateQueries({ queryKey: OWNER_VENUES_KEY });
  qc.invalidateQueries({ queryKey: OWNER_REVIEWS_KEY });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ venueId, data }: { venueId: number; data: CreateReviewRequest }) =>
      reviewService.createForVenue(venueId, data),
    onSuccess: (_result, { venueId }) => {
      invalidateAfterReviewMutation(qc, venueId);
    },
  });
}

export function useUpdateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, venueId, data }: { reviewId: number; venueId: number; data: UpdateReviewRequest }) =>
      reviewService.update(reviewId, data),
    onSuccess: (_result, { venueId }) => {
      invalidateAfterReviewMutation(qc, venueId);
    },
  });
}

export function useDeleteReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId }: { reviewId: number; venueId: number }) =>
      reviewService.delete(reviewId),
    onSuccess: (_result, { venueId }) => {
      invalidateAfterReviewMutation(qc, venueId);
    },
  });
}
