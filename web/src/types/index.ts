// =============================================================================
// LifeOS - Shared Type Definitions
// Single source of truth for all TypeScript types
// =============================================================================

// -----------------------------------------------------------------------------
// Skill Types
// -----------------------------------------------------------------------------

export interface Skill {
  id: string
  title: string
  format: string
  content: string
  updated_at: string
  synced_at?: string
  pending_sync?: boolean
  note_count?: number
}

export interface Note {
  id: number
  skill_id: string
  title: string
  content: string
  type: 'manual' | 'ai-generated'
  created_at: string
  updated_at?: string
}

export interface SkillDetail {
  skill: Skill
  notes: Note[]
}

export interface SkillReference {
  id: number
  skill_id: string
  path: string
  type: 'file' | 'dir'
  name: string
  content: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Chat Types
// -----------------------------------------------------------------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created: string
}

export interface ChatSession {
  sessionId: string
}

// -----------------------------------------------------------------------------
// AI Types
// -----------------------------------------------------------------------------

export interface AIPreviewResponse {
  skill_id: string
  title: string
  original_content: string
  updated_content: string
  rendered_html: string
}

// -----------------------------------------------------------------------------
// Photo Types (for future use)
// -----------------------------------------------------------------------------

export interface Photo {
  id: number
  filename: string
  path: string
  caption?: string
  description?: string
  created_at: string
  tags?: string[]
}

export interface PhotoTag {
  id: number
  name: string
}