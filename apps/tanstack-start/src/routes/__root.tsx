/// <reference types="vite/client" />
import type { QueryClient } from "@tanstack/react-query";
import type { TRPCOptionsProxy } from "@trpc/tanstack-react-query";
import type * as React from "react";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import type { AppRouter } from "@stock/api";
import {
  themeDetectorScript,
  ThemeProvider,
  ThemeToggle,
} from "@stock/ui/theme";
import { Toaster } from "@stock/ui/toast";

import appCss from "~/styles.css?url";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  trpc: TRPCOptionsProxy<AppRouter>;
}>()({
  head: () => ({
    links: [{ rel: "stylesheet", href: appCss }],
    meta: [
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
    ],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            dangerouslySetInnerHTML={{ __html: themeDetectorScript }}
            suppressHydrationWarning
          />
          <HeadContent />
        </head>
        <body className="bg-background text-foreground min-h-screen font-sans antialiased">
          <header className="border-border/40 bg-background/80 sticky top-0 z-50 flex items-center justify-between border-b px-4 py-3 backdrop-blur-sm">
            <span className="text-lg font-bold tracking-tight">StockGrid</span>
            <ThemeToggle />
          </header>
          {children}
          <Toaster />
          <TanStackRouterDevtools position="bottom-right" />
          <Scripts />
        </body>
      </html>
    </ThemeProvider>
  );
}
