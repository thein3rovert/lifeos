export function MarkdownH1({ children }: { children?: React.ReactNode }) {
  return (
    <h1 className="text-white mt-6 mb-4 text-xl font-semibold tracking-tight border-b border-default pb-2">
      {children}
    </h1>
  );
}

export function MarkdownH2({ children }: { children?: React.ReactNode }) {
  return <h2 className="text-white mt-5 mb-3 text-lg font-semibold tracking-tight">{children}</h2>;
}

export function MarkdownH3({ children }: { children?: React.ReactNode }) {
  return <h3 className="text-secondary mt-4 mb-2 text-base font-semibold">{children}</h3>;
}

export function MarkdownH4({ children }: { children?: React.ReactNode }) {
  return <h4 className="text-secondary mt-3 mb-2 text-sm font-semibold">{children}</h4>;
}
