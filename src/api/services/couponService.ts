import { apiClient } from '../client';
import type {
  CouponDto, CreateCouponRequest, UpdateCouponRequest,
  ValidateCouponRequest, CouponValidationResponse, Page,
} from '../types';

export const couponService = {
  // Player: list active coupons
  list: () =>
    apiClient.get<CouponDto[]>('/api/v1/coupons').then((r) => r.data),

  validate: (data: ValidateCouponRequest) =>
    apiClient
      .post<CouponValidationResponse>('/api/v1/coupons/validate', data)
      .then((r) => r.data),

  // Admin
  listAdmin: (params?: { page?: number; size?: number }) =>
    apiClient.get<Page<CouponDto>>('/api/v1/admin/coupons', { params }).then((r) => r.data),

  create: (data: CreateCouponRequest) =>
    apiClient.post<CouponDto>('/api/v1/admin/coupons', data).then((r) => r.data),

  update: (id: number, data: UpdateCouponRequest) =>
    apiClient.patch<CouponDto>(`/api/v1/admin/coupons/${id}`, data).then((r) => r.data),
};
