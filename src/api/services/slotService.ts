import { apiClient } from '../client';
import type { BlockSelectedRequest, BulkBlockRequest, CourtSlotsDto, SlotDto } from '../types';

export const slotService = {
  listByCourtAndDate: (courtId: number, date: string) =>
    apiClient
      .get<SlotDto[]>(`/api/v1/courts/${courtId}/slots`, { params: { date } })
      .then((r) => r.data),

  listByVenueAndDate: (venueId: number, date: string, sportId?: number) =>
    apiClient
      .get<CourtSlotsDto[]>(`/api/v1/venues/${venueId}/slots`, {
        params: { date, ...(sportId !== undefined && { sportId }) },
      })
      .then((r) => r.data),

  block: (slotId: number) =>
    apiClient.patch<SlotDto>(`/api/v1/slots/${slotId}/block`).then((r) => r.data),

  blockByTime: (courtId: number, date: string, startTime: string, endTime: string) =>
    apiClient
      .patch<SlotDto>(`/api/v1/courts/${courtId}/slots/block-by-time`, null, {
        params: { date, startTime, endTime },
      })
      .then((r) => r.data),

  unblock: (slotId: number) =>
    apiClient.patch<SlotDto>(`/api/v1/slots/${slotId}/unblock`).then((r) => r.data),

  bulkBlock: (courtId: number, data: BulkBlockRequest) =>
    apiClient
      .post<SlotDto[]>(`/api/v1/courts/${courtId}/slots/bulk-block`, data)
      .then((r) => r.data),

  blockSelected: (courtId: number, data: BlockSelectedRequest) =>
    apiClient
      .post<SlotDto[]>(`/api/v1/courts/${courtId}/slots/block-selected`, data)
      .then((r) => r.data),
};
