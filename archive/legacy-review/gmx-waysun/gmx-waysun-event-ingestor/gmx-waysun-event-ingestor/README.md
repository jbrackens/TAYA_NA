# stella-event-ingestor

This repository contains a server which receives the events sent from the users' apps over HTTP and submits them to
Kafka topic.

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Scalafmt](#scalafmt)
    - [Scalafix](#scalafix)
- [Set Up Before Running The Server Locally](#set-up-before-running-the-server-locally)
    - [Set up fake IP and local stella.local domain](#set-up-fake-ip-and-local-stellalocal-domain)
    - [Start gmx-traefik](#start-gmx-traefik)
- [Build & Run Locally](#build--run-locally)
- [Build & Run Local Docker Image](#build--run-local-docker-image)
- [Configuration](#configuration)
    - [Event Ingestor Server](#event-ingestor-server)
    - [JWT](#jwt)
    - [Open API](#open-api)
    - [Apache Kafka](#apache-kafka)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [sbt](https://www.scala-sbt.org/download.html)

## Git Configuration

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that a ticket number present in a branch name (e.g. `feature/SP-205-add-docker-compose`) will also
be automatically reflected in the commit messages (e.g. `[SP-205] Add docker-compose.yaml for event ingestor`).

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/SP-205-add-docker-compose-file`. As one can see, such names contain three
parts:

- a type of work (e.g. feature, chore, bug)
- a task number
- short information about a task

A task number should be also included in a PR title, e.g. `[SP-205] Add docker-compose.yaml for event ingestor`.

### Scalafmt

The code is formatted automatically during compilation in `sbt` using `scalafmt`. When using IntelliJ, select `scalafmt`
as a formatter to be used.

### Scalafix

We use Scalafix to guarantee an automated code quality standard. Including, but not limited to, organizing imports.

Before submitting a PR, Scalafix rules should be applied. To do that, run:

```shell script
sbt scalafixAll
```

## Set Up Before Running The Server Locally

* This project depends on [stella-common](https://github.com/flipadmin/gmx-waysun-common) and
  [data-api](https://github.com/flipadmin/gmx-waysun-data-api) which is published to Nexus, so it's required to have VPN
  configured and started.

* This project depends on [gmx-traefik](https://github.com/flipadmin/gmx-traefik) which is used to start a basic
  infrastructure and configure reverse proxy

### Set up fake IP and local stella.local domain

1. Create docker network

       docker network create gmx-internal

2. Add entry to `/etc/hosts`

       sudo echo "192.168.99.1    stella.local" >> /etc/hosts

3. Create a `loopback` device alias (it may be needed to repeat this after every reboot)

   **darwin:**

   ```shell script
   sudo ifconfig lo0 alias 192.168.99.1 255.255.255.0
   ```

   **linux:**

   ```shell script
   sudo ifconfig lo:0 192.168.99.1 netmask 255.255.255.0 up
   ```

   ---

   *To remove alias, just run:*

   **darwin:**

   ```shell script
   sudo ifconfig lo0 -alias 192.168.99.1
   ```

   **linux:**

   ```shell script
   sudo ifconfig lo:0 192.168.99.1 netmask 255.255.255.0 down
   ```

### Start `gmx-traefik`

This step will start by default:

* Reverse proxy (Traefik)
* Postgres database
* PgAdmin GUI
* Kafka Cluster
* Zookeeper

```shell script
docker-compose -f <gmx_traefik_repository>/docker-compose.yaml up -d
```

## Build & Run Locally

First of all, you'll need to start docker-compose using a file
from [gmx-traefik repository](#build--run-local-docker-image)

```shell script
docker-compose -f path/to/gmx-traefik/docker-compose.yml up
```

It's also needed to have [stella-platform-events](https://github.com/flipadmin/gmx-waysun-data-api) dependency. The
dependency is published to Nexus, so it's required to have VPN configured and started.

Having it done, we can start a server in sbt

```shell script
sbt event-ingestor/run
```

or IntelliJ.

Once the server is up, you can open `http://stella.local:8000/event_ingestor_docs` to see Open API definition (which
also can be used in an interactive way to send the requests). The service uses JWT and verifies user's permissions, so
it's needed to pass Bearer token in Authorization header. This can be disabled in config
via `stella.event-ingestor.http-server.require-jwt-auth`. The expected, custom JWT structure is
described [here](https://waysun.atlassian.net/wiki/spaces/WAYS/pages/551911425/REST+admin#RESTadmin-AuthorizationRequest)

You can also open `http://localhost:3030` provided by docker-compose file in order to open Lenses.io Kafka dashboard and
check the Kafka topics and the registered schemas.

By default, it's needed to kill an application to stop it. This behaviour can be changed in the configuration by setting
enable-interactive-shutdown to true. In that case one can type `exit` in order to stop the server gracefully.

There's also a dedicated event populator based on Gatling (see GatlingPopulator.scala). To run it,
use `sbt gatling:test`.

## Build & Run Local Docker Image

It's needed to have [stella-platform-events](https://github.com/flipadmin/gmx-waysun-data-api) dependency. Right now
it's not yet published to Nexus so you'll need to checkout `master` branch and run `sbt publishLocal`.

```shell script
sbt event-ingestor/docker:publishLocal
cd resources/docker-compose
```

You'll need to clone [gmx-traefik](https://github.com/flipadmin/gmx-traefik/tree/develop) as we'll need
docker-compose.yaml from this repo.

```shell script
docker network create gmx-internal
docker-compose -f path/to/gmx-traefik/docker-compose.yml -f docker-compose.yml up
```

## Configuration

We use Typesafe Config to configure the behaviour of the application. It allows the devs and the admins to override the
default value via environment variables.

### Event Ingestor Server

| Env Variable | Meaning |
|----------|-------------|
| EVENT_INGESTOR_HOST | Host on which the server should be available |
| EVENT_INGESTOR_PORT | Port on which the server should be available |
| EVENT_INGESTOR_EVENT_PUBLICATION_MODE | One of: publishDirectlyToKafka, storeInRedis, storeInRedisAndStartKafkaPublicationService |

### JWT

| Env Variable | Meaning |
|----------|-------------|
| EVENT_INGESTOR_REQUIRE_JWT_AUTH | Whether content of Authorization Bearer token should be validated |
| EVENT_INGESTOR_TEST_USER_ID | Used instead of a value from JWT when JWT auth is disabled |
| EVENT_INGESTOR_TEST_PROJECT_ID | Used instead of a value from JWT when JWT auth is disabled |
| JWT_SERVICE_DISCOVERY_URI | A prefix that must be present in the JWT token's `iss` field |
| JWT_INTERNAL_SERVICE_DISCOVERY_URI | Where the server should look for required issuer and JWKS URI |
| EVENT_INGESTOR_ISSUER_CACHE_REFRESH_FREQUENCY | After what time a new value of an issuer property should be read from the service discovery endpoint |
| EVENT_INGESTOR_JWKS_CACHE_REFRESH_FREQUENCY | After what time a new JWKS version should be loaded |
| EVENT_INGESTOR_SECRET_BOX_HEX_KEY | A key used to encrypt and decrypt `extra` field in JWT. The production keys should be strictly confidential |

### Open API

| Env Variable | Meaning |
|----------|-------------|
| EVENT_INGESTOR_OPEN_API_SERVER_URL | Where requests from Open API UI will be sent when using 'Try it out' option |

### Apache Kafka

| Env Variable | Meaning |
|----------|-------------|
| EVENT_INGESTOR_KAFKA_PLATFORM_EVENTS_TOPIC_NAME | Topic to which the events should be published |
| EVENT_INGESTOR_KAFKA_SCHEMA_REGISTRY_URL | AVRO schema registry URI |
| EVENT_INGESTOR_KAFKA_BOOTSTRAP_SERVERS | Kafka brokers address |
| EVENT_INGESTOR_KAFKA_CLIENT_ID | Check Kafka docs for `client-id` |
| EVENT_INGESTOR_KAFKA_MAX_REQUESTS_PER_CONNECTION | Check Kafka docs for `max-in-flight-requests-per-connection` |
| EVENT_INGESTOR_KAFKA_GROUP_ID | Check Kafka docs for `group-id` |
| EVENT_INGESTOR_KAFKA_PUBLICATION_TIME_LIMIT | How long to wait before the timeout when publishing to Kafka |
| EVENT_INGESTOR_KAFKA_POLL_TIMEOUT | How long to wait for events when checking previous message in the leader mode |

### Redis Persistence

| Env Variable | Meaning |
|----------|-------------|
| EVENT_INGESTOR_REDIS_PERSISTENCE_COLLECTION_NAME | A Redis collection where incoming events are stored |
| EVENT_INGESTOR_REDIS_PERSISTENCE_EVENTS_CHECK_FREQUENCY_SECONDS | If there's no more events to process, we wait for that time before we look for new events |
| EVENT_INGESTOR_REDIS_PERSISTENCE_LEADER_LOCK_NAME | A name of a Redis lock used to be obtained be a leader |
| EVENT_INGESTOR_REDIS_PERSISTENCE_REDISSON_CONFIG_PATH | Path to redisson config defining Redis connection details |
| EVENT_INGESTOR_REDIS_PERSISTENCE_REDISSON_CONFIG_IN_RESOURCES | Whether we should look in resources for an above file or it's a file system-related path |
| EVENT_INGESTOR_REDIS_URL | Redis single instance URI |
