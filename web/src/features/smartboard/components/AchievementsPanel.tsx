import type { AchievementsData } from '@/types';
import { SmartBoardItemCard } from './SmartBoardItemCard';
import { SmartBoardPanel } from './SmartBoardPanel';

type AchievementsPanelProps = {
  data: AchievementsData | null;
  loading: boolean;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  onEditItem: (itemId: string, achievement: string, title?: string) => void;
  nextRefresh?: Date | null;
  lastError?: string;
  paused?: boolean;
};

export function AchievementsPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
  nextRefresh,
  lastError,
  paused,
}: AchievementsPanelProps) {
  const items = data?.achievements || [];

  return (
    <SmartBoardPanel
      title="Weekly Achievements"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
      accentColor="green"
      nextRefresh={nextRefresh}
      lastError={lastError}
      paused={paused}
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No achievements recorded yet. Click refresh to scan your journals.
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <SmartBoardItemCard
              key={item.id}
              index={idx + 1}
              title={item.title || item.achievement.substring(0, 40)}
              date={item.date}
              description={item.achievement}
              dotColor="green"
              onClick={() => onEditItem(item.id, item.achievement, item.title)}
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  );
}
