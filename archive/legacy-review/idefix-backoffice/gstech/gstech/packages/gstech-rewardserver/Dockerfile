FROM node:18.20.4-alpine AS builder

ENV PYTHONUNBUFFERED=1

RUN apk add --no-cache g++ make python3 && \
    ln -sf python3 /usr/bin/python && \
    rm -rf /var/cache/* /tmp/* /var/tmp/*

WORKDIR /app
COPY package.json lerna.json yarn.lock .yarnrc /app/

RUN yarn install --frozen-lockfile && \
    yarn cache clean

FROM node:18.20.4-alpine
WORKDIR /app

ENV TZ=Europe/Malta

COPY --from=builder /app .
COPY packages/gstech-core /app/packages/gstech-core
COPY packages/gstech-rewardserver /app/packages/gstech-rewardserver
RUN yarn bootstrap

RUN chown -R node /app/node_modules/.cache
USER node
CMD ["sh", "-c", "yarn migrate && yarn workspace gstech-rewardserver serve"]

HEALTHCHECK --retries=5 CMD wget http://localhost:3012/api/v1/status -q -O - > /dev/null 2>&1
