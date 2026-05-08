import { Sidebar } from "@/components/layout/sidebar";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 pl-60">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}