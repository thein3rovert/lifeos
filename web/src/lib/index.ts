// =============================================================================
// LifeOS - Lib Exports
// =============================================================================

// API client (includes re-exports of types for convenience)
export { api } from './api'
export type {
  Skill,
  Note,
  SkillDetail,
  SkillReference,
  ChatMessage,
  ChatSession,
  AIPreviewResponse,
} from '@/types'

// Skills utilities
export { stripFrontmatter, formatDate } from './skills/utils'

// Tree utilities
export { buildTree, type TreeNode } from './utils/tree'