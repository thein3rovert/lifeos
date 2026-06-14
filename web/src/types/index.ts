// =============================================================================
// LifeOS - Shared Type Definitions
// Single source of truth for all TypeScript types
// =============================================================================

// -----------------------------------------------------------------------------
// Skill Types
// -----------------------------------------------------------------------------

export interface Skill {
  id: string;
  title: string;
  format: string;
  content: string;
  updated_at: string;
  synced_at?: string;
  pending_sync?: boolean;
  note_count?: number;
}

export interface Note {
  id: number;
  skill_id: string;
  title: string;
  content: string;
  type: 'manual' | 'ai-generated';
  created_at: string;
  updated_at?: string;
}

export interface SkillDetail {
  skill: Skill;
  notes: Note[];
}

export interface SkillReference {
  id: number;
  skill_id: string;
  path: string;
  type: 'file' | 'dir';
  name: string;
  content: string;
  updated_at: string;
}

// -----------------------------------------------------------------------------
// Chat Types
// -----------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created: string;
}

export interface ChatSession {
  sessionId: string;
}

// -----------------------------------------------------------------------------
// AI Types
// -----------------------------------------------------------------------------

export interface AIPreviewResponse {
  skill_id: string;
  title: string;
  original_content: string;
  updated_content: string;
  rendered_html: string;
}

// -----------------------------------------------------------------------------
// Photo Types (for future use)
// -----------------------------------------------------------------------------

export interface Photo {
  id: number;
  filename: string;
  path: string;
  caption?: string;
  description?: string;
  created_at: string;
  tags?: string[];
}

export interface PhotoTag {
  id: number;
  name: string;
}

// -----------------------------------------------------------------------------
// Smart Board Types
// -----------------------------------------------------------------------------

export interface ThingsToRememberItem {
  id: string;
  title: string;
  text: string;
  category: 'urgent' | 'important' | 'not-important';
  source: string;
  date: string;
}

export interface ThingsToRememberData {
  items: ThingsToRememberItem[];
}

export interface SuggestionItem {
  id: string;
  title: string;
  suggestion: string;
  reasoning: string;
  status: 'active' | 'dismissed' | 'completed';
  createdAt: string;
}

export interface SuggestionsData {
  suggestions: SuggestionItem[];
}

export interface AchievementItem {
  id: string;
  title: string;
  achievement: string;
  date: string;
  source: string;
}

export interface AchievementsData {
  achievements: AchievementItem[];
}

export interface BlockerItem {
  id: string;
  title: string;
  blocker: string;
  context: string;
  date: string;
  source: string;
}

export interface BlockersData {
  blockers: BlockerItem[];
}

export type PanelType = 'things-to-remember' | 'suggestions' | 'achievements' | 'blockers';

export interface SmartBoardPanelResponse {
  panelType: PanelType;
  data: ThingsToRememberData | SuggestionsData | AchievementsData | BlockersData | null;
  lastRefreshed: string | null;
}

export interface PanelScheduleStatus {
  nextRefresh: string;
  lastError: string;
  interval: string;
}

export type ScheduleStatusMap = Record<PanelType, PanelScheduleStatus>;
