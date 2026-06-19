import { apiClient } from '../client';
import type { ReviewDto, CreateReviewRequest, UpdateReviewRequest, Page } from '../types';

export const reviewService = {
  listByVenue: (venueId: number, params?: { page?: number; size?: number }) =>
    apiClient
      .get<Page<ReviewDto>>(`/api/v1/venues/${venueId}/reviews`, { params })
      .then((r) => r.data),

  getMyReview: (venueId: number) =>
    apiClient
      .get<ReviewDto>(`/api/v1/venues/${venueId}/reviews/me`)
      .then((r) => (r.status === 204 ? null : r.data)),

  createForVenue: (venueId: number, data: CreateReviewRequest) =>
    apiClient
      .post<ReviewDto>(`/api/v1/venues/${venueId}/reviews`, data)
      .then((r) => r.data),

  update: (reviewId: number, data: UpdateReviewRequest) =>
    apiClient
      .put<ReviewDto>(`/api/v1/reviews/${reviewId}`, data)
      .then((r) => r.data),

  delete: (reviewId: number) =>
    apiClient.delete(`/api/v1/reviews/${reviewId}`),

  listOwner: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<ReviewDto>>('/api/v1/owner/reviews', { params }).then((r) => r.data),
};
