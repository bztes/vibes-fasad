# Corepack runs pnpm (version from package.json `packageManager`); install it fresh rather than relying on the bundled one.
FROM node:24-bookworm-slim AS node
RUN npm install -g corepack && corepack enable
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

FROM node AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
# The build validates the env vars (see src/env.ts) but doesn't inline them: placeholders are enough.
RUN DATABASE_URL=:memory: pnpm build

FROM node:24-bookworm-slim
WORKDIR /app
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000 \
	DATABASE_URL=file:/data/local.db \
	DIR=/data \
	BODY_SIZE_LIMIT=20M
VOLUME /data
EXPOSE 3000

CMD ["node", "build"]
