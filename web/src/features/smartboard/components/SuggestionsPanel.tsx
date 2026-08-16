import { CategoryMenu } from '@/components/ui/CategoryMenu';
import { getStateOptions } from '@/features/smartboard/constants';
import type { SuggestionsData } from '@/types';
import { SmartBoardItemCard } from './SmartBoardItemCard';
import { SmartBoardPanel } from './SmartBoardPanel';

type SuggestionsPanelProps = {
  data: SuggestionsData | null;
  loading: boolean;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  onEditItem: (itemId: string, suggestion: string, reasoning: string, title?: string) => void;
  onChangeStatus: (itemId: string, status: string) => void;
  nextRefresh?: Date | null;
  lastError?: string;
  paused?: boolean;
};

export function SuggestionsPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
  onChangeStatus,
  nextRefresh,
  lastError,
  paused,
}: SuggestionsPanelProps) {
  const items = data?.suggestions || [];

  // Map status to badge variant
  const statusToBadgeVariant = (status: string): 'active' | 'dismissed' | 'completed' => {
    switch (status) {
      case 'completed':
        return 'completed';
      case 'dismissed':
        return 'dismissed';
      default:
        return 'active';
    }
  };

  // Map status to dot color
  const statusToDotColor = (status: string): 'green' | 'gray' | 'blue' => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'dismissed':
        return 'gray';
      default:
        return 'blue';
    }
  };

  // Format status label
  const formatStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <SmartBoardPanel
      title="Suggestions / Coach"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
      accentColor="blue"
      nextRefresh={nextRefresh}
      lastError={lastError}
      paused={paused}
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No suggestions yet. Click refresh to get coaching insights.
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <CategoryMenu
              key={item.id}
              options={getStateOptions('suggestions')!}
              onSelect={(value) =>
                onChangeStatus(item.id, value as 'active' | 'dismissed' | 'completed')
              }
              trigger={
                <SmartBoardItemCard
                  index={idx + 1}
                  title={item.title || item.suggestion.substring(0, 40)}
                  date={item.createdAt?.substring(0, 10) || ''}
                  description={item.suggestion}
                  badge={{
                    label: formatStatusLabel(item.status),
                    variant: statusToBadgeVariant(item.status),
                  }}
                  dotColor={statusToDotColor(item.status)}
                  onClick={() => onEditItem(item.id, item.suggestion, item.reasoning, item.title)}
                />
              }
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  );
}
