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
    title: "StockGrid - Track the Financial world.",
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      {
        rel: "preload",
        href: "/brand.svg",
        as: "image",
        type: "image/svg+xml",
      },
    ],
    meta: [
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "description",
        content: "Track markets, watchlists, and financial instruments.",
      },
      {
        property: "og:title",
        content: "StockGrid - Track the Financial world.",
      },
      {
        property: "og:description",
        content: "Track markets, watchlists, and financial instruments.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        property: "og:site_name",
        content: "StockGrid",
      },
      {
        property: "og:image",
        content: "/brand.svg",
      },
      {
        property: "og:image:type",
        content: "image/svg+xml",
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
            <button
              type="button"
              className="focus-visible:ring-ring/30 cursor-pointer rounded-md outline-none focus-visible:ring-[3px]"
              aria-label="Go to StockGrid home"
              onClick={() => {
                window.location.href = "/";
              }}
            >
              <img
                src="/brand.svg"
                width={652}
                height={151}
                alt="StockGrid"
                className="h-8 w-auto"
                fetchPriority="high"
              />
            </button>
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
