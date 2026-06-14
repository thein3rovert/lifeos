// =============================================================================
// LifeOS - Lib Exports
// =============================================================================

export type {
  AIPreviewResponse,
  ChatMessage,
  ChatSession,
  Note,
  Skill,
  SkillDetail,
  SkillReference,
} from '@/types';
// API client (includes re-exports of types for convenience)
export { api } from './api';

// Skills utilities
export { formatDate, stripFrontmatter } from './skills/utils';

// Tree utilities
export { buildTree, type TreeNode } from './utils/tree';
