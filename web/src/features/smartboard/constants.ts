import type { PanelType } from '@/types';

/**
 * State options for Smart Board panels that carry state.
 * Keyed by PanelType. Panels without state (achievements, blockers) have no entry.
 *
 * Shared by the card display (CategoryMenu in the panel) and the rendered
 * display (state-switch control in InlineCanvasEditor footer). Keep these as
 * the single source of truth so both controls stay in sync.
 */
export type StateOption = {
  value: string;
  label: string;
};

export const STATE_OPTIONS: Partial<Record<PanelType, StateOption[]>> = {
  'things-to-remember': [
    { value: 'urgent', label: 'Urgent' },
    { value: 'important', label: 'Important' },
    { value: 'not-important', label: 'Not Important' },
  ],
  suggestions: [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'dismissed', label: 'Dismissed' },
  ],
};

/**
 * Panels that carry state (i.e. eligible for the rendered display's
 * state-switch control). Achievements and Blockers are intentionally excluded.
 */
export const STATEFUL_PANELS: PanelType[] = ['things-to-remember', 'suggestions'];

export function getStateOptions(panelType: PanelType | undefined | null): StateOption[] | undefined {
  if (!panelType) return undefined;
  return STATE_OPTIONS[panelType];
}

/**
 * Format a raw state value as a human-readable label (e.g. "not-important" → "Not Important").
 * Falls back to title-casing when no explicit option label is found.
 */
export function formatStateLabel(panelType: PanelType | undefined | null, state: string): string {
  const options = getStateOptions(panelType) ?? [];
  const match = options.find((o) => o.value === state);
  if (match) return match.label;
  return state.charAt(0).toUpperCase() + state.slice(1).replace('-', ' ');
}