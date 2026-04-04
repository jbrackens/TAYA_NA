# Install dependencies only when needed
FROM node:16.13-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /src
COPY package.json yarn.lock workspace.json nx.json ./
RUN yarn install --frozen-lockfile

# Rebuild the source code only when needed
FROM node:16.13-alpine AS builder
WORKDIR /src
COPY . .
COPY --from=deps /src/node_modules ./node_modules
RUN --mount=target=/src/node_modules/.cache/nx,type=cache \
    yarn build:all


# Production image, copy all the files and run next
FROM node:16.13-alpine AS runner
WORKDIR /src

ENV NODE_ENV production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY . .
COPY --from=builder /src/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /src/dist ./dist
RUN chown nextjs:nodejs -R /src/node_modules/.cache/nx

USER nextjs

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Uncomment the following line in case you want to disable telemetry.
ENV NEXT_TELEMETRY_DISABLED 1

CMD ["yarn", "start"]

HEALTHCHECK --retries=5 CMD wget http://localhost:$PORT/api/v1/status -q -O - > /dev/null 2>&1
