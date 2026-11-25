# Shared Dockerfile layout of the vibes projects: keep it in sync across them.

ARG NODE_IMAGE=node:24-bookworm-slim

# Runs natively on the runner: the output is platform-independent JS, and vite's
# native binaries crash with SIGILL (exit 132) under QEMU arm64 emulation.
# --platform must be on an image, not a stage: a stage reference keeps the target platform.
FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS build
# Corepack runs pnpm (version from package.json `packageManager`); install it fresh rather than relying on the bundled one.
RUN npm install -g corepack && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile
COPY . .
# The build validates the env vars (see src/env.ts) but does not inline them: placeholders are enough.
RUN DATABASE_URL=:memory: pnpm build

# Dependencies for the target platform: native packages ship per-platform binaries.
# Only `dependencies`: adapter-node bundles everything else into the build output.
FROM ${NODE_IMAGE} AS deps
RUN npm install -g corepack && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile --prod

FROM ${NODE_IMAGE}
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
# Migrations are applied on server start.
COPY --from=build /app/drizzle ./drizzle

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	DATABASE_URL=file:/data/local.db \
	DIR=/data \
	BODY_SIZE_LIMIT=20M
VOLUME /data
EXPOSE 3000
# Polls /health (src/routes/health/+server.ts); node, as the slim image has neither curl nor wget.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
	CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "build"]
