import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface RenderMarkdownProps {
  children: string
}

export function RenderMarkdown({ children }: RenderMarkdownProps) {
  const components: Partial<Components> = {
    // Headings - Atlas style: dense, minimal
    h1: ({ children }) => (
      <h1 className="text-white mt-6 mb-4 text-xl font-semibold tracking-tight border-b border-default pb-2">
        {children}
      </h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-white mt-5 mb-3 text-lg font-semibold tracking-tight">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-secondary mt-4 mb-2 text-base font-semibold">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-secondary mt-3 mb-2 text-sm font-semibold">
        {children}
      </h4>
    ),

    // Paragraphs
    p: ({ children }) => (
      <p className="text-secondary mb-3 text-atlas-base leading-6">
        {children}
      </p>
    ),

    // Links - Atlas blue for links
    a: ({ href, children }) => (
      <a
        href={String(href ?? '#')}
        className="text-highlight hover:text-highlight-hover transition-colors duration-150"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),

    // Lists
    ul: ({ children }) => (
      <ul className="text-secondary marker:text-muted mb-3 ml-4 list-disc space-y-1 text-atlas-base">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="text-secondary marker:text-muted mb-3 ml-4 list-decimal space-y-1 text-atlas-base marker:font-semibold">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-1 leading-6">{children}</li>
    ),

    // Blockquotes
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-default my-3 py-2 pr-3 pl-3 text-atlas-base italic bg-hover/50">
        {children}
      </blockquote>
    ),

    // Code - inline and block
    code: ({ children, className }) => {
      const isInline = !className || !String(className).includes('language-')
      return isInline ? (
        <code className="bg-raised text-primary-accent rounded px-1.5 py-0.5 font-mono text-xs border border-default">
          {children}
        </code>
      ) : (
        <code className="bg-raised text-secondary block overflow-x-auto rounded border border-default p-3 font-mono text-xs leading-relaxed">
          {children}
        </code>
      )
    },
    pre: ({ children }) => (
      <pre className="mb-3 overflow-x-auto">{children}</pre>
    ),

    // Horizontal Rule
    hr: () => (
      <hr className="border-default my-4 border-t" />
    ),

    // Strong/Bold
    strong: ({ children }) => (
      <strong className="text-white font-semibold">{children}</strong>
    ),

    // Emphasis/Italic
    em: ({ children }) => (
      <em className="text-secondary italic">{children}</em>
    ),

    // Tables
    table: ({ children }) => (
      <div className="my-3 overflow-x-auto">
        <table className="min-w-full border border-default divide-y divide-default">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-raised">{children}</thead>,
    tbody: ({ children }) => (
      <tbody className="divide-y divide-default bg-black">{children}</tbody>
    ),
    tr: ({ children }) => <tr>{children}</tr>,
    th: ({ children }) => (
      <th className="text-white px-3 py-2 text-left text-xs font-semibold">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="text-secondary px-3 py-2 text-xs">
        {children}
      </td>
    ),
  }

  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {children}
    </ReactMarkdown>
  )
}
