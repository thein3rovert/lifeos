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
}

export function RenderMarkdown({ children }: RenderMarkdownProps) {
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

  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  );
}
