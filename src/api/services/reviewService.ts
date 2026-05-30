import { apiClient } from '../client';
import type { ReviewDto, CreateReviewRequest, Page } from '../types';

export const reviewService = {
  listByVenue: (venueId: number, params?: { page?: number; size?: number }) =>
    apiClient
      .get<Page<ReviewDto>>(`/api/v1/venues/${venueId}/reviews`, { params })
      .then((r) => r.data),

  create: (data: CreateReviewRequest) =>
    apiClient.post<ReviewDto>('/api/v1/reviews', data).then((r) => r.data),

  // Owner: list reviews across all their venues
  listOwner: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<ReviewDto>>('/api/v1/owner/reviews', { params }).then((r) => r.data),
};
