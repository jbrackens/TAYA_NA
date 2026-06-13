# syntax=docker/dockerfile:experimental
FROM node:14.17.0

WORKDIR /usr/src

COPY --chown=node . .
# A good practice: manually inspect what we've just copied from build context,
# to check if there is anything that should be added to .dockerignore.
RUN find . | sort

# We need to enable experimental syntax (requires DOCKER_BUILDKIT=1)
# to allow to mount a secret just for the execution of `yarn install`
# (we need that to access our private Nexus repository) -
# so that .npmrc does NOT remain in any layer of the image.
# See https://www.alexandraulsh.com/2018/06/25/docker-npmrc-security/ for the UNsafe alternatives.
# This article suggests using multistage builds... which is okay-ish,
# but would still bake the secret into commit history of the first stage,
# which we would later need to explicitly remove from build cache... mounting a secret is just easier.
RUN --mount=type=secret,id=npmrc,dst=$HOME/.npmrc yarn install
# A paranoia check to make sure .npmrc does NOT remain in the image
RUN ! test -e $HOME/.npmrc
RUN yarn bootstrap

# Let's move the ARGs further down the Dockerfile (as close to the actual use as possible)
# to make a better use of build cache.
ARG module_name
RUN yarn build --scope @phoenix-ui/$module_name

EXPOSE 3000

USER node

# Note that unlike in RUNs, we need to use an ENV, not just ARG
# since ARGs are only available during the image build,
# while `$...`s in CMD are only evaluated once container is started.
ENV MODULE_NAME=$module_name
CMD yarn start:$MODULE_NAME
