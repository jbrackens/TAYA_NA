FROM node:16.16-alpine

RUN mkdir -p /src/app
WORKDIR /src/app

COPY package.json yarn.lock /src/app/
RUN yarn --non-interactive

COPY . /src/app

RUN yarn build

EXPOSE 5000
CMD ["yarn", "start:server"]
