import { HeadContent, Scripts, createRootRoute, Link, useRouter } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import {
  ImageIcon,
  BookOpen,
  StickyNote,
  Settings
} from 'lucide-react'
import NotFound from '../components/NotFound'
import ErrorComponent from '../components/ErrorComponent'

import appCss from '../styles.css?url'

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
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-black text-white font-sans antialiased min-h-screen">
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar - 220px fixed width */}
          <aside className="w-[220px] flex-shrink-0 bg-black border-r border-[#1e1e1e] flex flex-col">
            {/* Logo area */}
            <div className="h-9 flex items-center px-4 border-b border-[#1e1e1e]">
              <span className="text-sm font-semibold tracking-tight">LifeOS</span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-2 px-3 space-y-0.5">
              <NavItem to="/" icon={<ImageIcon className="w-4 h-4" strokeWidth={1.5} />}>
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
            <div className="py-2 px-3 border-t border-[#1e1e1e]">
              <NavItem to="/settings" icon={<Settings className="w-4 h-4" strokeWidth={1.5} />}>
                Settings
              </NavItem>
            </div>
          </aside>

          {/* Main content area */}
          <main className="flex-1 flex flex-col min-w-0 bg-black">
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
        flex items-center gap-2.5 h-7 px-2 rounded text-[13px] font-medium
        transition-colors duration-150 ease-out
        ${isActive
          ? 'bg-[rgba(255,255,255,0.06)] text-white'
          : 'text-[#aaa] hover:bg-[rgba(255,255,255,0.04)] hover:text-white'
        }
      `}
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}
