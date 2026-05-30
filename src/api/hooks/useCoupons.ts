import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { couponService } from '../services/couponService';
import { adaptCoupon } from '../adapters';
import type { CreateCouponRequest, UpdateCouponRequest, ValidateCouponRequest } from '../types';

export const COUPONS_KEY = ['coupons'] as const;
export const ADMIN_COUPONS_KEY = ['admin', 'coupons'] as const;

export function useCoupons() {
  return useQuery({
    queryKey: COUPONS_KEY,
    queryFn: async () => {
      const dtos = await couponService.list();
      return dtos.map(adaptCoupon);
    },
  });
}

export function useAdminCoupons(params?: { page?: number }) {
  return useQuery({
    queryKey: [...ADMIN_COUPONS_KEY, params],
    queryFn: async () => {
      const page = await couponService.listAdmin(params);
      return {
        coupons: page.content.map(adaptCoupon),
        totalPages: page.totalPages,
        totalElements: page.totalElements,
      };
    },
  });
}

export function useValidateCoupon() {
  return useMutation({
    mutationFn: (data: ValidateCouponRequest) => couponService.validate(data),
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCouponRequest) => couponService.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_COUPONS_KEY }),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCouponRequest }) =>
      couponService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ADMIN_COUPONS_KEY });
      qc.invalidateQueries({ queryKey: COUPONS_KEY });
    },
  });
}
