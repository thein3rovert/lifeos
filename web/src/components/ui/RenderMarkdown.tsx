import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  MarkdownBlockquote,
  MarkdownCode,
  MarkdownEm,
  MarkdownH1,
  MarkdownH2,
  MarkdownH3,
  MarkdownH4,
  MarkdownHr,
  MarkdownLink,
  MarkdownListItem,
  MarkdownOrderedList,
  MarkdownParagraph,
  MarkdownPre,
  MarkdownStrong,
  MarkdownTable,
  MarkdownTbody,
  MarkdownTd,
  MarkdownTh,
  MarkdownThead,
  MarkdownTr,
  MarkdownUnorderedList,
} from './markdown';

interface RenderMarkdownProps {
  children: string;
  variant?: 'default' | 'chat';
}

export function RenderMarkdown({ children, variant = 'default' }: RenderMarkdownProps) {
  const components: Partial<Components> = {
    h1: MarkdownH1,
    h2: MarkdownH2,
    h3: MarkdownH3,
    h4: MarkdownH4,
    p: MarkdownParagraph,
    a: MarkdownLink,
    ul: MarkdownUnorderedList,
    ol: MarkdownOrderedList,
    li: MarkdownListItem,
    blockquote: MarkdownBlockquote,
    code: MarkdownCode,
    pre: MarkdownPre,
    hr: MarkdownHr,
    strong: MarkdownStrong,
    em: MarkdownEm,
    table: MarkdownTable,
    thead: MarkdownThead,
    tbody: MarkdownTbody,
    tr: MarkdownTr,
    th: MarkdownTh,
    td: MarkdownTd,
  };

  // Chat bubbles need tighter spacing than full pages. Keep these styles local.
  if (variant === 'chat') {
    return (
      <div className="min-w-0 break-words text-sm leading-relaxed text-primary [&_p]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-primary [&_p:last-child]:mb-0 [&_h1]:mt-3 [&_h1]:mb-2 [&_h1]:text-base [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:text-sm [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:mb-2 [&_ul]:text-sm [&_ol]:mb-2 [&_ol]:text-sm [&_li]:leading-relaxed [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre_code]:block [&_pre_code]:w-max [&_pre_code]:min-w-full [&_pre_code]:whitespace-pre [&_table]:text-sm">
        <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
          {children}
        </ReactMarkdown>
      </div>
    );
  }
  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}
