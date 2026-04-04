FROM node:18.14
WORKDIR /src
ENV PORT 3051
COPY package.json yarn.lock /src/
RUN yarn install

COPY . .

RUN yarn build

CMD ["yarn", "serve"]

HEALTHCHECK --retries=5 CMD curl --fail http://localhost:3051 2>&1 || exit 1
