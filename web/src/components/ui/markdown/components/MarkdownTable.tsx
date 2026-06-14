export function MarkdownTable({ children }: { children?: React.ReactNode }) {
  return (
    <div className="my-3 overflow-x-auto">
      <table className="min-w-full border border-default divide-y divide-default">{children}</table>
    </div>
  );
}

export function MarkdownThead({ children }: { children?: React.ReactNode }) {
  return <thead className="bg-raised">{children}</thead>;
}

export function MarkdownTbody({ children }: { children?: React.ReactNode }) {
  return <tbody className="divide-y divide-default bg-base">{children}</tbody>;
}

export function MarkdownTr({ children }: { children?: React.ReactNode }) {
  return <tr>{children}</tr>;
}

export function MarkdownTh({ children }: { children?: React.ReactNode }) {
  return <th className="text-white px-3 py-2 text-left text-xs font-semibold">{children}</th>;
}

export function MarkdownTd({ children }: { children?: React.ReactNode }) {
  return <td className="text-secondary px-3 py-2 text-xs">{children}</td>;
}
