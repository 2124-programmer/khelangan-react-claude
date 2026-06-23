import { apiClient } from '../client';
import type {
  AdminDisputePageDto, DisputeStatsDto, DisputeDetailDto,
  DisputeResolveBody, DisputeReasonBody, DisputeMessageBody, DisputeRequestInfoBody, DisputeNoteBody,
} from '../types';

const BASE = '/api/v1/admin/disputes';

export interface DisputeListParams {
  q?: string;
  status?: string[];
  category?: string[];
  priority?: string;
  assigned?: string;
  sort?: string;
  page?: number;
  size?: number;
}

export const adminDisputeService = {
  list: (params: DisputeListParams) =>
    apiClient
      // indexes:null → arrays serialize as repeated keys (status=OPEN&status=UNDER_REVIEW) per the contract.
      .get<AdminDisputePageDto>(BASE, { params, paramsSerializer: { indexes: null } })
      .then((r) => r.data),

  stats: () => apiClient.get<DisputeStatsDto>(`${BASE}/stats`).then((r) => r.data),

  detail: (id: number) => apiClient.get<DisputeDetailDto>(`${BASE}/${id}`).then((r) => r.data),

  assign: (id: number, adminId?: number | null) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/assign`, { adminId: adminId ?? null }).then((r) => r.data),
  message: (id: number, body: DisputeMessageBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/message`, body).then((r) => r.data),
  requestInfo: (id: number, body: DisputeRequestInfoBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/request-info`, body).then((r) => r.data),
  addNote: (id: number, body: DisputeNoteBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/notes`, body).then((r) => r.data),
  resolve: (id: number, body: DisputeResolveBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/resolve`, body).then((r) => r.data),
  dismiss: (id: number, body: DisputeReasonBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/dismiss`, body).then((r) => r.data),
  reopen: (id: number, body: DisputeReasonBody) =>
    apiClient.post<DisputeDetailDto>(`${BASE}/${id}/reopen`, body).then((r) => r.data),
};
