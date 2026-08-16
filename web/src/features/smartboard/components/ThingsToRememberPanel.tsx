import { CategoryMenu } from '@/components/ui/CategoryMenu';
import { getStateOptions } from '@/features/smartboard/constants';
import type { ThingsToRememberData } from '@/types';
import { SmartBoardItemCard } from './SmartBoardItemCard';
import { SmartBoardPanel } from './SmartBoardPanel';

type ThingsToRememberPanelProps = {
  data: ThingsToRememberData | null;
  loading: boolean;
  lastRefreshed: Date | null;
  onRefresh: () => void;
  onEditItem: (itemId: string, text: string, title?: string) => void;
  onChangeCategory: (itemId: string, category: string) => void;
  nextRefresh?: Date | null;
  lastError?: string;
  paused?: boolean;
};

export function ThingsToRememberPanel({
  data,
  loading,
  lastRefreshed,
  onRefresh,
  onEditItem,
  onChangeCategory,
  nextRefresh,
  lastError,
  paused,
}: ThingsToRememberPanelProps) {
  const items = data?.items || [];

  // Map category to badge variant
  const categoryToBadgeVariant = (category: string): 'urgent' | 'important' | 'not-important' => {
    switch (category) {
      case 'urgent':
        return 'urgent';
      case 'important':
        return 'important';
      default:
        return 'not-important';
    }
  };

  // Map category to dot color
  const categoryToDotColor = (category: string): 'red' | 'yellow' | 'gray' => {
    switch (category) {
      case 'urgent':
        return 'red';
      case 'important':
        return 'yellow';
      default:
        return 'gray';
    }
  };

  // Format category label
  const formatCategoryLabel = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ');
  };

  return (
    <SmartBoardPanel
      title="Things to Remember"
      loading={loading}
      lastRefreshed={lastRefreshed}
      onRefresh={onRefresh}
      accentColor="red"
      nextRefresh={nextRefresh}
      lastError={lastError}
      paused={paused}
    >
      {items.length === 0 ? (
        <div className="text-center text-secondary text-sm py-8">
          No items yet. Click refresh to analyze your notes.
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, idx) => (
            <CategoryMenu
              key={item.id}
              options={getStateOptions('things-to-remember')!}
              onSelect={(value) =>
                onChangeCategory(item.id, value as 'urgent' | 'important' | 'not-important')
              }
              trigger={
                <SmartBoardItemCard
                  index={idx + 1}
                  title={item.title || item.text.substring(0, 40)}
                  date={item.date}
                  description={item.text}
                  badge={{
                    label: formatCategoryLabel(item.category),
                    variant: categoryToBadgeVariant(item.category),
                  }}
                  dotColor={categoryToDotColor(item.category)}
                  onClick={() => onEditItem(item.id, item.text, item.title)}
                />
              }
            />
          ))}
        </div>
      )}
    </SmartBoardPanel>
  );
}
