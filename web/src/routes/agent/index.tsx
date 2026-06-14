import { createFileRoute } from '@tanstack/react-router';
import { AgentSmartBoard } from '@/components/agent';

export const Route = createFileRoute('/agent/')({
  component: AgentSmartBoard,
});
