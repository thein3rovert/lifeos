export function MarkdownCode({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  const isInline = !className || !String(className).includes('language-');

  if (isInline) {
    return (
      <code className="bg-raised text-primary-accent rounded px-1.5 py-0.5 font-mono text-xs border border-default">
        {children}
      </code>
    );
  }

  return (
    <code className="bg-raised text-secondary block overflow-x-auto rounded border border-default p-3 font-mono text-xs leading-relaxed">
      {children}
    </code>
  );
}

export function MarkdownPre({ children }: { children?: React.ReactNode }) {
  return <pre className="mb-3 overflow-x-auto">{children}</pre>;
}
