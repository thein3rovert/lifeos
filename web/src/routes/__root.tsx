import { TanStackDevtools } from '@tanstack/react-devtools';
import { createRootRoute, HeadContent, Link, Scripts, useRouter } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
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
import ErrorComponent from '@/components/ui/ErrorComponent';
import NotFound from '@/components/ui/NotFound';
import { Toaster } from '@/components/ui/Toast';

import appCss from '@/global.css?url';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

// Inject runtime config from server env vars so the frontend can read them
// in the browser without a rebuild. Set API_URL on the frontend container to
// override the default window.location-based detection.
function getRuntimeConfig() {
  if (typeof process === 'undefined' || !process.env) return {};
  return {
    API_URL: process.env.API_URL || '',
  };
}
const APP_CONFIG_SCRIPT = `window.APP_CONFIG = ${JSON.stringify(getRuntimeConfig())};`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'LifeOS',
      },
    ],
    links: [
      {
        rel: 'preload',
        as: 'style',
        href: appCss,
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        href: '/logo192.png',
      },
      {
        rel: 'manifest',
        href: '/manifest.json',
      },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: APP_CONFIG_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-base text-white font-sans antialiased min-h-screen">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside
            className={`
              ${sidebarCollapsed ? 'w-0' : 'w-[240px]'}
              shrink-0 bg-base border-r border-default
              flex flex-col overflow-hidden transition-all duration-200
            `}
          >
            {/* Logo area with avatar/collapse */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-default">
              {!sidebarCollapsed && (
                <>
                  <div className="flex items-center gap-2">
                    <img
                      src="/logo-512.png"
                      alt="LifeOS"
                      className="w-9 h-9 rounded object-contain"
                    />
                    <span className="font-logo text-lg tracking-wide text-white">LifeOS</span>
                  </div>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
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
              <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />}>
                Dashboard
              </NavItem>
              <NavItem to="/search" icon={<Search className="w-4 h-4" strokeWidth={1.5} />}>
                Search
              </NavItem>
              <NavItem to="/notifications" icon={<Bell className="w-4 h-4" strokeWidth={1.5} />}>
                Notifications
              </NavItem>
            </nav>

            {/* Divider */}
            <div className="mx-3 border-t border-default" />

            {/* Main navigation section */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
              <NavItem to="/agent" icon={<Sparkles className="w-4 h-4" strokeWidth={1.5} />}>
                Smart Board
              </NavItem>
              <NavItem to="/skills" icon={<BookOpen className="w-4 h-4" strokeWidth={1.5} />}>
                Skills
              </NavItem>
              <NavItem to="/notes" icon={<StickyNote className="w-4 h-4" strokeWidth={1.5} />}>
                Notes
              </NavItem>
              <NavItem to="/settings" icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}>
                Settings
              </NavItem>
            </nav>
          </aside>

          {/* Expand sidebar button (when collapsed) */}
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute left-0 top-6 z-50 p-2 bg-raised border border-default border-l-0 rounded-r hover:bg-hover transition-colors"
            >
              <Menu className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
            </button>
          )}

          {/* Main content area */}
          <main className="flex-1 min-w-0 bg-base overflow-hidden">{children}</main>
        </div>

        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Toaster />
        <Scripts />
      </body>
    </html>
  );
}

// Navigation item component following Atlas patterns
function NavItem({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
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
        {icon}
      </span>
      <span>{children}</span>
    </Link>
  );
}
