import { Link, useRouter } from '@tanstack/react-router';
import {
  Bell,
  BookOpen,
  ChevronLeft,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Sparkles,
  StickyNote,
} from 'lucide-react';
import { useState } from 'react';

const toolsNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

const mainNav = [
  { to: '/agent', label: 'Smart Board', icon: Sparkles },
  { to: '/skills', label: 'Skills', icon: BookOpen },
  { to: '/notes', label: 'Notes', icon: StickyNote },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={`
          ${collapsed ? 'w-0' : 'w-[240px]'}
          shrink-0 bg-base border-r border-default
          flex flex-col overflow-hidden transition-all duration-200
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-default">
          {!collapsed && (
            <>
              <div className="flex items-center gap-2.5">
                <img src="/logo-512.png" alt="LifeOS" className="w-8 h-8 rounded object-contain" />
                <span className="font-logo text-lg tracking-wide text-white leading-none">LifeOS</span>
              </div>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="p-1.5 hover:bg-hover rounded transition-colors"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
              </button>
            </>
          )}
        </div>

        {/* Tools section */}
        <nav className="py-4 px-3 space-y-1">
          {toolsNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-3 border-t border-default" />

        {/* Main navigation section */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {mainNav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
      </aside>

      {collapsed && (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="absolute left-0 top-6 z-50 p-2 bg-raised border border-default border-l-0 rounded-r hover:bg-hover transition-colors"
          aria-label="Expand sidebar"
        >
          <Menu className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
        </button>
      )}
    </>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  const router = useRouter();
  const isActive = router.state.location.pathname === to;

  return (
    <Link
      to={to}
      className={`
        group flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium
        transition-all duration-150 ease-out
        ${
          isActive
            ? 'bg-raised text-white border border-default'
            : 'text-secondary hover:text-white border border-transparent'
        }
      `}
    >
      <span className={isActive ? 'text-white' : 'text-tertiary group-hover:text-white'}>
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </span>
      <span>{label}</span>
    </Link>
  );
}
