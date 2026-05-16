import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  LayoutDashboard,
  ImageIcon,
  BookOpen,
  StickyNote,
  Settings,
  ChevronLeft,
  Menu
} from 'lucide-react'
import { useState } from 'react'
import NotFound from '@/components/ui/NotFound'
import ErrorComponent from '@/components/ui/ErrorComponent'

import appCss from '@/global.css?url'

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`

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
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-black text-white font-sans antialiased min-h-screen">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar */}
          <aside className={`
            ${sidebarCollapsed ? 'w-0' : 'w-sidebar'}
            shrink-0 bg-black border-r border-default
            flex flex-col overflow-hidden transition-all duration-200
          `}>
            {/* Logo area with collapse button */}
            <div className="h-12 flex items-center justify-between px-4 border-b border-default">
              {!sidebarCollapsed && (
                <>
                  <span className="text-sm font-semibold tracking-tight">LifeOS</span>
                  <button
                    onClick={() => setSidebarCollapsed(true)}
                    className="p-1.5 hover:bg-hover rounded transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-tertiary" strokeWidth={1.5} />
                  </button>
                </>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-3 px-3 space-y-0.5">
              <NavItem to="/" icon={<LayoutDashboard className="w-4 h-4" strokeWidth={1.5} />}>
                Dashboard
              </NavItem>
              <NavItem to="/gallery" icon={<ImageIcon className="w-4 h-4" strokeWidth={1.5} />}>
                Gallery
              </NavItem>
              <NavItem to="/skills" icon={<BookOpen className="w-4 h-4" strokeWidth={1.5} />}>
                Skills
              </NavItem>
              <NavItem to="/notes" icon={<StickyNote className="w-4 h-4" strokeWidth={1.5} />}>
                Notes
              </NavItem>
            </nav>

            {/* Bottom settings */}
            <div className="py-3 px-3 border-t border-default">
              <NavItem to="/settings" icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}>
                Settings
              </NavItem>
            </div>
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
          <main className="flex-1 min-w-0 bg-black overflow-hidden">
            {children}
          </main>
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
        <Scripts />
      </body>
    </html>
  )
}

// Navigation item component following Atlas patterns
function NavItem({ to, icon, children }: { to: string; icon: React.ReactNode; children: React.ReactNode }) {
  const router = useRouter()
  const isActive = router.state.location.pathname === to

  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2.5 h-7 px-2 rounded text-atlas-base font-medium
        transition-colors duration-150 ease-out
        ${isActive
          ? 'bg-selected text-white'
          : 'text-secondary hover:bg-hover hover:text-white'
        }
      `}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
