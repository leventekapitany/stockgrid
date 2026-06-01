# ── Build stage ──────────────────────────────
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

# Copy workspace root files needed for install
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/tanstack-start/package.json apps/tanstack-start/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/ui/package.json packages/ui/
COPY packages/validators/package.json packages/validators/
COPY tooling/eslint/package.json tooling/eslint/
COPY tooling/prettier/package.json tooling/prettier/
COPY tooling/tailwind/package.json tooling/tailwind/
COPY tooling/typescript/package.json tooling/typescript/

RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Build with node-server preset instead of cloudflare_module
ENV NITRO_PRESET=node-server
ARG VITE_TICKER_WS_URL=wss://stockgrid.app/ws
ENV VITE_TICKER_WS_URL=$VITE_TICKER_WS_URL
RUN pnpm --filter @stock/tanstack-start build

# ── Runtime stage ────────────────────────────
FROM node:22-slim
WORKDIR /app

COPY --from=build /app/apps/tanstack-start/.output .output

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
