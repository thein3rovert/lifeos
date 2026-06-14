export function MarkdownBlockquote({ children }: { children?: React.ReactNode }) {
  return (
    <blockquote className="border-l-2 border-default my-3 py-2 pr-3 pl-3 text-base italic bg-hover/50">
      {children}
    </blockquote>
  );
}
