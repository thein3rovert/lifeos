import type { PanelType, ScheduleStatusMap, SmartBoardPanelResponse } from '@/types';
import { fetcher } from './client';

export const smartboardApi = {
  getPanel: (panelType: PanelType) =>
    fetcher<SmartBoardPanelResponse>(`/api/smartboard/${panelType}`),

  refreshPanel: (panelType: PanelType, force = true) =>
    fetcher<SmartBoardPanelResponse>(`/api/smartboard/refresh/${panelType}?force=${force}`, {
      method: 'POST',
    }),

  updateItemStatus: (itemId: string, panelType: PanelType, status: string) =>
    fetcher<{ message: string }>(`/api/smartboard/item/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ panelType, status }),
    }),

  updateItemContent: (itemId: string, panelType: PanelType, fields: Record<string, string>) =>
    fetcher<{ message: string }>(`/api/smartboard/item/${itemId}/content`, {
      method: 'PATCH',
      body: JSON.stringify({ panelType, fields }),
    }),

  getSchedule: () => fetcher<ScheduleStatusMap>('/api/smartboard/schedule'),

  pausePanel: (panelType: PanelType) =>
    fetcher<{ message: string }>(`/api/smartboard/schedule/${panelType}/pause`, {
      method: 'POST',
    }),

  resumePanel: (panelType: PanelType) =>
    fetcher<{ message: string }>(`/api/smartboard/schedule/${panelType}/resume`, {
      method: 'POST',
    }),

  setPanelSchedule: (
    panelType: PanelType,
    config: {
      mode: 'interval' | 'weekly';
      intervalMinutes?: number;
      weeklyDay?: number;
      weeklyHour?: number;
    }
  ) =>
    fetcher<{ message: string }>(`/api/smartboard/schedule/${panelType}`, {
      method: 'POST',
      body: JSON.stringify(config),
    }),

  pauseAllPanels: () =>
    fetcher<{ message: string }>('/api/smartboard/schedule/pause-all', {
      method: 'POST',
    }),

  resumeAllPanels: () =>
    fetcher<{ message: string }>('/api/smartboard/schedule/resume-all', {
      method: 'POST',
    }),
};
