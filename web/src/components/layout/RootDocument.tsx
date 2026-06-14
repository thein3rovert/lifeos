import { TanStackDevtools } from '@tanstack/react-devtools';
import { HeadContent, Scripts } from '@tanstack/react-router';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/Toast';
import { Sidebar } from './Sidebar';

const THEME_INIT_SCRIPT = `(function(){try{var stored=window.localStorage.getItem('theme');var mode=(stored==='light'||stored==='dark'||stored==='auto')?stored:'auto';var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved=mode==='auto'?(prefersDark?'dark':'light'):mode;var root=document.documentElement;root.classList.remove('light','dark');root.classList.add(resolved);if(mode==='auto'){root.removeAttribute('data-theme')}else{root.setAttribute('data-theme',mode)}root.style.colorScheme=resolved;}catch(e){}})();`;

function getRuntimeConfig() {
  if (typeof process === 'undefined' || !process.env) return {};
  return {
    API_URL: process.env.API_URL || '',
  };
}
const APP_CONFIG_SCRIPT = `window.APP_CONFIG = ${JSON.stringify(getRuntimeConfig())};`;

export function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: controlled inline scripts for runtime config and theme init */}
        <script dangerouslySetInnerHTML={{ __html: APP_CONFIG_SCRIPT }} />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: controlled inline theme initialization script */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-base text-white font-sans antialiased min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
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
