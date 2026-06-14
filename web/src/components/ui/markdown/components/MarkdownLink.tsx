export function MarkdownLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  return (
    <a
      href={String(href ?? '#')}
      className="text-highlight hover:text-highlight-hover transition-colors duration-150"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
