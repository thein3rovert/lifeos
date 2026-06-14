export function MarkdownStrong({ children }: { children?: React.ReactNode }) {
  return <strong className="text-white font-semibold">{children}</strong>;
}

export function MarkdownEm({ children }: { children?: React.ReactNode }) {
  return <em className="text-secondary italic">{children}</em>;
}
