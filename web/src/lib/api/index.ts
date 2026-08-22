import { agentApi } from './agent';
import { calendarApi } from './calendar';
import { chatApi } from './chat';
import { notesApi } from './notes';
import { referencesApi } from './references';
import { skillsApi } from './skills';
import { smartboardApi } from './smartboard';

export const api = {
  skills: skillsApi,
  notes: notesApi,
  chat: chatApi,
  references: referencesApi,
  agent: agentApi,
  smartboard: smartboardApi,
  calendar: calendarApi,
};

export { fetcher } from './client';
