# ── Build stage (pnpm for lockfile compat) ───
FROM node:22-slim AS build
RUN corepack enable && corepack prepare pnpm@10.33.2 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/ticker/package.json apps/ticker/
COPY packages/api/package.json packages/api/
COPY packages/auth/package.json packages/auth/
COPY packages/db/package.json packages/db/
COPY packages/validators/package.json packages/validators/
COPY tooling/eslint/package.json tooling/eslint/
COPY tooling/prettier/package.json tooling/prettier/
COPY tooling/tailwind/package.json tooling/tailwind/
COPY tooling/typescript/package.json tooling/typescript/

RUN pnpm install --frozen-lockfile

COPY . .

# ── Runtime (Bun runs TS directly) ──────────
FROM oven/bun:1-slim
WORKDIR /app

COPY --from=build /app .

ENV NODE_ENV=production
ENV PORT=4001
EXPOSE 4001

CMD ["bun", "apps/ticker/src/index.ts"]
