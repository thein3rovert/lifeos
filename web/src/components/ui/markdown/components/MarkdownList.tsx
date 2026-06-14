export function MarkdownUnorderedList({ children }: { children?: React.ReactNode }) {
  return (
    <ul className="text-secondary marker:text-muted mb-3 ml-4 list-disc space-y-1 text-base">
      {children}
    </ul>
  );
}

export function MarkdownOrderedList({ children }: { children?: React.ReactNode }) {
  return (
    <ol className="text-secondary marker:text-muted mb-3 ml-4 list-decimal space-y-1 text-base marker:font-semibold">
      {children}
    </ol>
  );
}

export function MarkdownListItem({ children }: { children?: React.ReactNode }) {
  return <li className="pl-1 leading-6">{children}</li>;
}
