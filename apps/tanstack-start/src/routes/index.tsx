import { createFileRoute } from "@tanstack/react-router";

import { WatchlistPage } from "~/components/watchlist/watchlist-page";

export const Route = createFileRoute("/")({
  component: WatchlistPage,
});
