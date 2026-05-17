# Multi-stage build for @phoenix-ui/{app,office} (parameterized by module_name).
#
# Why this shape (validated 2026-05-17 — see DEMO_DEPLOYMENT_PLAN.md
# "Validation status"): single-stage COPY-everything produced a ~7.7 GB image.
# This builds in a full toolchain stage, then ships only Next's `output:
# "standalone"` traced closure (server + minimal node_modules) + static +
# public — typically a few hundred MB.
#
# Build-debt fixes baked in (the original Dockerfile + plan A0 were off by 6):
#  - node:14 -> node:20-bookworm-slim
#  - no private-Nexus .npmrc secret mount (deps are yarn-workspace-resolved;
#    yarn.lock has zero @phoenix-ui / flipsports entries)
#  - NO `yarn bootstrap` (lerna bootstrap EEXISTs on @babel/.bin under node:20
#    + yarn workspaces); build the target package via `yarn lerna run build`
#  - app build uses `next build --webpack` (Next 16 defaults to Turbopack;
#    the app needs its custom webpack alias) — set in packages/app/package.json
#  - @phoenix-ui/api-client declared in packages/app deps; qs typing shimmed
#  - .dockerignore must NOT exclude /packages/utils or public/static/locales
#
# NOTE (standalone + rewrites): Next evaluates next.config rewrites() at BUILD
# time for standalone output, so NEXT_PUBLIC_API_URL in the rewrite destination
# is baked, not runtime. Irrelevant for Path A: Caddy owns /api and /ws on the
# single origin, so the Next rewrite never fires in production.

# ---- Stage 1: builder (full toolchain) ----
FROM node:20-bookworm-slim AS builder
WORKDIR /usr/src

COPY . .

# Root package.json is private + has workspaces, so `yarn install` already
# installs and symlinks every @phoenix-ui/* package. Do NOT run `yarn bootstrap`.
RUN yarn install --frozen-lockfile

ARG module_name
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
# Builds workspace deps (utils, api-client) then the target package.
RUN yarn lerna run build --scope @phoenix-ui/$module_name --include-dependencies

# ---- Stage 2: runtime (standalone closure only) ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Standalone server binds HOSTNAME (default localhost — would be unreachable
# from Caddy/host). 0.0.0.0 so the container is reachable.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

ARG module_name
ENV MODULE_NAME=$module_name

# Next standalone is rooted at outputFileTracingRoot (= talon-backoffice root),
# so the traced tree under .next/standalone mirrors packages/<m>/...
COPY --from=builder --chown=node:node /usr/src/packages/${module_name}/.next/standalone ./
COPY --from=builder --chown=node:node /usr/src/packages/${module_name}/.next/static ./packages/${module_name}/.next/static
COPY --from=builder --chown=node:node /usr/src/packages/${module_name}/public ./packages/${module_name}/public

EXPOSE 3000
USER node
# $MODULE_NAME resolved at container start (ARGs are build-only).
CMD ["sh", "-c", "node packages/$MODULE_NAME/server.js"]
