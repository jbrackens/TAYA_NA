# stella-leaderboard

This service caches the aggregation results from Kafka in Postgres and allows fetching data for the leaderboards using
REST API.

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Scalafmt](#scalafmt)
    - [Scalafix](#scalafix)
- [Project Structure](#project-structure)
- [Set Up Before Running The Server Locally](#set-up-before-running-the-server-locally)
    - [Set up fake IP and local `stella.local` domain](#set-up-fake-ip-and-local-stellalocal-domain)
    - [Start `gmx-traefik`](#start-gmx-traefik)
    - [Postgres set up](#postgres-set-up)
    - [Liquibase migrations](#liquibase-migrations)
- [Run Locally via sbt](#run-locally-via-sbt)
- [Build & Run Local Docker Image](#build--run-local-docker-image)
- [Configuration](#configuration)
    - [Leaderboard Data Server](#leaderboard-data-server)
    - [JWT](#jwt)
    - [Open API](#open-api)
    - [Database](#database)
    - [Apache Kafka](#apache-kafka)
    - [Logs](#logs)
    - [Redis cache](#redis-cache)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [sbt](https://www.scala-sbt.org/download.html)
* [Docker >= 20.10.5](https://www.docker.com/products/docker-desktop)
* [Docker Compose >= 1.29.1](https://github.com/docker/compose/releases)

* [optional] [jenv](https://www.jenv.be/)

## Git Configuration

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that a ticket number present in a branch name (e.g. `feature/SP-495-bootstrap-project`) will also
be automatically reflected in the commit messages (
e.g. `[SP-495] Create initial skeleton of the project with build files, Jenkinsfile and akka-http server using Stella commons`)

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/SP-495-bootstrap-project`. As one can see, such names contain three parts:

- a type of work (e.g. feature, chore, bug)
- a task number
- short information about a task

A task number should be also included in a PR title,
e.g. `[SP-495] Create initial skeleton of the project with build files, Jenkinsfile and akka-http server using Stella commons`

### Scalafmt

The code is formatted automatically during compilation in `sbt` using `scalafmt`. When using IntelliJ, select `scalafmt`
as a formatter to be used.

### Scalafix

We use Scalafix to guarantee an automated code quality standard. Including, but not limited to, organizing imports.

Before submitting a PR, Scalafix rules should be applied. To do that, run:

```shell script
sbt scalafixAll
```

## Project Structure

1. `aggregation-result-ingestor`

   It contains the Kafka client which takes aggregation results from Kafka topic and stores them in Postgres in a common
   format. It's supposed to be run as a separate docker container.


2. `common`

   It contains the leaderboard bounded context's service layer with the underlying, shared data model and data
   repository.


3. `integration-test-common`

   It contains the test-related classes used both by `aggregation-result-ingestor` and `common`. Eventually we can
   consider extracting some of them into a shared module
   in [stella-common project](https://github.com/flipadmin/gmx-waysun-common)


4. `server`

   Play Framework server which joins the logic from `common` with the endpoints definitions and adds an auth layer.

## Set Up Before Running The Server Locally

* This project depends on [gmx-traefik](https://github.com/flipadmin/gmx-traefik) which is used to start a basic
  infrastructure and configure reverse proxy

* It's also required to have VPN configured and started in order to fetch the internal dependencies.

### Set up fake IP and local `stella.local` domain

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

### Postgres set up

Create database and users for local development

1. Open http://stella.local:8000/pgadmin/
2. Enter credentials from `gmx-traefic/docker-compose.yml` (`PGADMIN_DEFAULT_EMAIL` / `PGADMIN_DEFAULT_PASSWORD`)
3. Add local postgres server `postgres:POSTGRES_PASSWORD@postgres` where `POSTGRES_PASSWORD`
   from `gmx-traefic/docker-compose.yml`
4. Connect and:
    * create a database like in `resources/postgres/10_create-backend-db.sql`
    * execute `resources/postgres/20_create-backend-user.sql` using this database

### Liquibase migrations

This will start containers running Postgres and execute the Liquibase migrations found
in `common/src/main/resources/liquibase/changelog.xml`. Liquibase migrations are idempotent operations so they can be
executed multiple times.

```shell script
docker-compose -f resources/docker-compose/docker-compose.yml up leaderboard-liquibase
```

## Run Locally via sbt

```shell script
sbt aggregation-result-ingestor/run
sbt server/run
```

It's also possible to run the server using IntelliJ Ultimate.

Once the server is up, you can open `http://localhost:11000/leaderboard_docs` to see Open API definition (which also can
be used in an interactive way to send the requests). The service uses JWT and verifies user's permissions, so it's
needed to pass Bearer token in Authorization header. This can be disabled in config
via `stella.leaderboard.jwt.require-jwt-auth`. The expected, custom JWT structure is
described [here](https://waysun.atlassian.net/wiki/spaces/WAYS/pages/551911425/REST+admin#RESTadmin-AuthorizationRequest)

You can also open `http://localhost:3030` provided by docker-compose file in order to open Lenses.io Kafka dashboard and
check the Kafka topics and the registered schemas.

## Build & Run Local Docker Image

```shell script
sbt aggregation-result-ingestor/docker:publishLocal server/docker:publishLocal
cd resources/docker-compose
docker-compose up -d
```

## Configuration

We use Typesafe Config to configure the behaviour of the application. It allows the devs and the admins to override the
default value via environment variables.

### Leaderboard Data Server

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_HOST | Host on which the server should be available |
| LEADERBOARD_PORT | Port on which the server should be available |
| LEADERBOARD_PLAY_SECRET_KEY | The secret key is used to sign Play's session cookie. This must be changed for production |

### JWT

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_REQUIRE_JWT_AUTH | Whether content of Authorization Bearer token should be validated |
| LEADERBOARD_TEST_USER_ID | Used instead of a value from JWT when JWT auth is disabled |
| LEADERBOARD_TEST_PROJECT_ID | Used instead of a value from JWT when JWT auth is disabled |
| JWT_SERVICE_DISCOVERY_URI | A prefix that must be present in the JWT token's `iss` field |
| JWT_INTERNAL_SERVICE_DISCOVERY_URI | Where the server should look for required issuer and JWKS URI |
| LEADERBOARD_ISSUER_CACHE_REFRESH_FREQUENCY | After what time a new value of an issuer property should be read from the service discovery endpoint |
| LEADERBOARD_JWKS_CACHE_REFRESH_FREQUENCY | After what time a new JWKS version should be loaded |
| LEADERBOARD_SECRET_BOX_HEX_KEY | A key used to decrypt `extra` field in JWT. The production keys should be strictly confidential |

### Open API

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_OPEN_API_SERVER_URL | Where requests from Open API UI will be sent when using 'Try it out' option |

### Database

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_DB_ADDRESS | Postgres host address |
| LEADERBOARD_DB_PORT | Postgres port |
| LEADERBOARD_DB_NAME | Postgres database name where the aggregates are stored |
| LEADERBOARD_DB_USERNAME | Username of the user who can modify the above database |
| LEADERBOARD_DB_PASSWORD | Password of the above user |

### Apache Kafka

Used by the aggregation result ingestor.

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_KAFKA_AGGREGATES_TOPIC_NAME | Topic from which the aggregated events are read |
| LEADERBOARD_KAFKA_SCHEMA_REGISTRY_URL | AVRO schema registry URI |
| LEADERBOARD_KAFKA_BOOTSTRAP_SERVERS | Kafka brokers address |
| LEADERBOARD_KAFKA_CLIENT_ID | Check Kafka docs for `client-id`  |
| LEADERBOARD_KAFKA_GROUP_ID | Check Kafka docs for `group-id`  |
| LEADERBOARD_KAFKA_POLL_TIMEOUT | How long Kafka consumer will wait for data to arrive from network to fill the buffer | 

### Logs

| Env Variable | Meaning |
|----------|-------------|
| LOGGING_USE_JSON | Whether logs should be appended using LoggingEventCompositeJsonEncoder |

### Redis cache

| Env Variable | Meaning |
|----------|-------------|
| LEADERBOARD_REDIS_HOST | Redis single server host (in case of the cluster etc., Play configuration needs to be changed |
| LEADERBOARD_REDIS_PORT | Redis port |
| LEADERBOARD_REDIS_DATABASE_NUMBER | [optional] Redis database number to store data in |
| LEADERBOARD_REDIS_PASSWORD | [optional] Redis password to authenticate the client connections |
| LEADERBOARD_WINDOWS_CACHE_TIMEOUT | After that time the cached aggregation result windows need to be replaced with a current value from DB |
| LEADERBOARD_AGGREGATION_RESULTS_CACHE_TIMEOUT | After that time a cached aggregation result page needs to be replaced with a current value from DB |
| LEADERBOARD_NEIGHBORS_CACHE_TIMEOUT | After that time the cached aggregation result neighbors need to be replaced with a current value from DB |
| LEADERBOARD_COMPARE_RESULTS_CACHE_TIMEOUT | After that time the cached aggregation result neighbors need to be replaced with a current value from DB |
