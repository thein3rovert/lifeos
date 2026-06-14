// =============================================================================
// LifeOS - API Client
// Centralized API client for Go backend
//
// NOTE: The API client has been split into domain modules under src/lib/api/.
// This file is kept as a backward-compatible re-export.
// =============================================================================

export type {
  AIPreviewResponse,
  ChatMessage,
  ChatSession,
  Note,
  PanelType,
  ScheduleStatusMap,
  Skill,
  SkillDetail,
  SkillReference,
  SmartBoardPanelResponse,
} from '@/types';
export { api } from './api/index';
