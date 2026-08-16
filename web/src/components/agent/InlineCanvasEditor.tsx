import { ChevronDown, Edit3, Eye, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { CategoryMenu } from '@/components/ui/CategoryMenu';
import { RenderMarkdown } from '@/components/ui/RenderMarkdown';
import type { BadgeProps } from '@/components/ui/Badge';
import type { StateOption } from '@/features/smartboard/constants';

type InlineCanvasEditorProps = {
  title?: string;
  content: string;
  onSave: (newContent: string) => void;
  onClose: () => void;
  // Optional. Renders a state switcher in the footer when provided.
  stateOptions?: StateOption[];
  currentState?: string;
  onChangeState?: (newState: string) => void;
};

type StateBadgeVariant = NonNullable<BadgeProps['variant']>;

const STATE_TO_BADGE_VARIANT: Record<string, StateBadgeVariant> = {
  urgent: 'urgent',
  important: 'important',
  'not-important': 'not-important',
  active: 'active',
  completed: 'completed',
  dismissed: 'dismissed',
};

export function InlineCanvasEditor({
  title,
  content: initialContent,
  onSave,
  onClose,
  stateOptions,
  currentState,
  onChangeState,
}: InlineCanvasEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [isPreview, setIsPreview] = useState(true);

  // Update content when prop changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = () => {
    onSave(content);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-default flex items-center justify-between bg-raised gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Edit/Preview toggle */}
          <button
            onClick={() => setIsPreview(false)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              !isPreview ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'
            }`}
          >
            <Edit3 className="w-3 h-3" strokeWidth={1.5} />
            Edit
          </button>
          <button
            onClick={() => setIsPreview(true)}
            className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1.5 ${
              isPreview ? 'bg-tab-active text-primary' : 'text-secondary hover:bg-active'
            }`}
          >
            <Eye className="w-3 h-3" strokeWidth={1.5} />
            Preview
          </button>
        </div>

        {/* Centered title */}
        {title && (
          <h3 className="text-sm font-medium text-primary truncate flex-1 text-center min-w-0">
            {title}
          </h3>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-highlight text-white hover:bg-highlight-hover rounded text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Save className="w-3 h-3" strokeWidth={1.5} />
            Save
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-active rounded transition-colors text-secondary"
            aria-label="Close editor"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {isPreview ? (
          // Preview mode
          <div className="h-full overflow-y-auto p-4 bg-base">
            <div className="prose prose-invert prose-sm max-w-none">
              <RenderMarkdown>{content}</RenderMarkdown>
            </div>
          </div>
        ) : (
          // Edit mode
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full h-full bg-base border-none p-4 text-sm text-primary font-mono resize-none focus:outline-none focus:ring-0"
            placeholder="Edit content in Markdown..."
          />
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-default bg-raised flex items-center justify-between gap-3">
        <span className="text-xs text-tertiary">
          {content.length} characters · Markdown supported
        </span>

        {/* State switcher — only for panels with state */}
        {stateOptions && stateOptions.length > 0 && currentState && onChangeState && (
          <CategoryMenu
            options={stateOptions}
            onSelect={onChangeState}
            trigger={
              <button
                type="button"
                aria-label="Change state"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-input hover:bg-hover transition-colors text-primary border-default"
              >
                <Badge
                  variant={STATE_TO_BADGE_VARIANT[currentState] ?? 'default'}
                  className="border-0 bg-transparent p-0"
                >
                  {currentState.charAt(0).toUpperCase() + currentState.slice(1).replace('-', ' ')}
                </Badge>
                <ChevronDown className="w-3 h-3 text-secondary" strokeWidth={1.5} />
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
