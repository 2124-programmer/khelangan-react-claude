import { apiClient } from '../client';
import type { OwnerDashboardSummaryDto } from '../types';

export const ownerDashboardService = {
  getSummary: (): Promise<OwnerDashboardSummaryDto> =>
    apiClient.get<OwnerDashboardSummaryDto>('/api/v1/owner/dashboard/summary').then((r) => r.data),
};
