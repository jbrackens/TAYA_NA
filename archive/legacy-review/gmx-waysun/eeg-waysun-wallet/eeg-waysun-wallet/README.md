# stella-wallet

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Scalafmt](#scalafmt)
    - [Scalafix](#scalafix)
- [Set Up Before Running The Server Locally](#set-up-before-running-the-server-locally)
    - [Set up fake IP and local `stella.local` domain](#set-up-fake-ip-and-local-stellalocal-domain)
    - [Start `gmx-traefik`](#start-gmx-traefik)
    - [Postgres set up](#postgres-set-up)
    - [Liquibase migrations](#liquibase-migrations)
- [Build & Run Locally via Docker Image](#build--run-locally-via-docker-image)
- [Run Locally via sbt](#run-locally-via-sbt)
- [Docker Image Tags & Database Migrations](#docker-image-tags--database-migrations)
- [Configuration](#configuration)
    - [Wallet Server](#wallet-server)
    - [Wallet Akka Settings](#wallet-akka-settings)
    - [JWT](#jwt)
    - [Open API](#open-api)
    - [Database](#database)
    - [Logs](#logs)

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

This will make sure that a ticket number present in a branch name (e.g. `feature/SP-495-bootstrap-project`) will also be
automatically reflected in the commit messages (
e.g. `[SP-495] Create initial skeleton of the project with build files, Jenkinsfile and http server using Stella commons`)

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/SP-495-bootstrap-project`. As one can see, such names contain three parts:

- a type of work (e.g. feature, chore, bug)
- a task number
- short information about a task

A task number should be also included in a PR title,
e.g. `[SP-495] Create initial skeleton of the project with build files, Jenkinsfile and http server using Stella commons`

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
in `wallet/conf/liquibase/changelog.xml`. Liquibase migrations are idempotent operations so they can be executed
multiple times.

```shell script
docker-compose -f resources/docker-compose/docker-compose.yml up stella-wallet-liquibase
```

## Build & Run Locally via Docker Image

To build:

```shell script
sbt docker:publishLocal
```

To run via Docker

1. Start `gmx-traefic` by executing `docker-compose up -d` from `gmx-traefic` repository

2. Start `wallet`:

   ```shell script
   cd resources/docker-compose
   docker-compose up -d
   ```

   Or:

   ```shell script
   cd resources/docker-compose
   docker-compose up -d wallet
   ```

## Run Locally via sbt

```shell script
sbt wallet/run
```

It's also possible to run the server using IntelliJ Ultimate.

Once the server is up, you can open `http://localhost:15000/wallet_docs` to see Open API definition (which also can be
used in an interactive way to send the requests). The service uses JWT and verifies user's permissions, so it's needed
to pass Bearer token in Authorization header. This can be disabled in config
via `stella.wallet.server.jwt.require-jwt-auth`. The expected, custom JWT structure is
described [here](https://waysun.atlassian.net/wiki/spaces/WAYS/pages/551911425/REST+admin#RESTadmin-AuthorizationRequest)

## Docker Image Tags & Database Migrations

The database migrations are handled using `Liquibase`.

When starting the dependencies locally using Docker Compose, the database migrations are performed automatically.

On the other hand, when updating the staging/prod environment, they should be a separate step run on demand. Therefore,
our Jenkins publishes a separate docker image with the migration scripts embedded. As for now both the rule
configuration image and the database migration image are pushed to the same registry with the same name but with the
different tags to distinguish which is which. If the rule configuration image has a version `<version>` or `latest`, the
database migration image always has a version `db-migration-<version>` or `db-migration-latest`.

The database migration image requires to be started with the following arguments:

```shell script
--changeLogFile=changelog/changelog.xml \
--url=jdbc:postgresql://${WALLET_DB_ADDRESS}:${WALLET_DB_PORT}/${WALLET_DB_NAME} \
--username=${WALLET_LIQUIBASE_DB_USERNAME} \
--password=${WALLET_LIQUIBASE_DB_PASSWORD} \
update
```

Obviously the env variables need to be replaced with the correct values. The default values used in the dev mode are:

```shell script
WALLET_DB_ADDRESS=postgres
WALLET_DB_PORT=5432
WALLET_DB_NAME=WALLET
WALLET_LIQUIBASE_DB_USERNAME=WALLET_liquibase
WALLET_LIQUIBASE_DB_PASSWORD=WALLET_liquibase
```

## Configuration

We use Typesafe Config to configure the behaviour of the application. It allows the devs and the admins to override the
default value via environment variables.

### Wallet Server

| Env Variable | Meaning |
|----------|-------------|
| WALLET_HOST | Host on which the server should be available |
| WALLET_PORT | Port on which the server should be available |
| WALLET_PLAY_SECRET_KEY | The secret key is used to sign Play's session cookie. This must be changed for production |

### Wallet Akka Settings

| Env Variable | Meaning |
|----------|-------------|
| WALLET_ENTITY_ASK_TIMEOUT | How long the endpoints should wait for response from wallet entity in Actor cluster |
| WALLET_START_AKKA_MANAGEMENT_AND_CLUSTER_BOOTSTRAP | Needs to be enabled when forming Akka cluster with Kubernetes |
| WALLET_ENTITY_SNAPSHOT_NUMBER_OF_EVENTS | After this number of events the wallet state snapshot will be created |
| WALLET_ENTITY_SNAPSHOT_KEEP_N_SNAPSHOTS | How many snapshots should be preserved |
| WALLET_ENTITY_PERSISTENCE_FAILURE_RESTART_MIN_BACKOFF | Initial (minimal) duration before the actor restart |
| WALLET_ENTITY_PERSISTENCE_FAILURE_RESTART_MAX_BACKOFF | Max delay before the restart |
| WALLET_ENTITY_PERSISTENCE_FAILURE_RESTART_RANDOM_FACTOR | Factor used to increase the delay for another restart attempt |
| WALLET_ENTITY_TRANSACTION_PROJECTION_NAME | Unique projection name |
| WALLET_ENTITY_TRANSACTION_PROJECTION_SHARDS | Transaction events are marked using tags and based on this they are assigned to particular shards |
| WALLET_ENTITY_TRANSACTION_PROJECTION_PARALLELISM_LEVEL | How many transaction events may be processed at the same time by one shard |

### JWT

| Env Variable                          | Meaning |
|---------------------------------------|-------------|
| WALLET_REQUIRE_JWT_AUTH               | Whether content of Authorization Bearer token should be validated |
| WALLET_TEST_USER_ID                   | Used instead of a value from JWT when JWT auth is disabled |
| WALLET_TEST_PROJECT_ID                | Used instead of a value from JWT when JWT auth is disabled |
| JWT_SERVICE_DISCOVERY_URI             | A prefix that must be present in the JWT token's `iss` field |
| JWT_INTERNAL_SERVICE_DISCOVERY_URI    | Where the server should look for required issuer and JWKS URI |
| WALLET_ISSUER_CACHE_REFRESH_FREQUENCY | After what time a new value of an issuer property should be read from the service discovery endpoint |
| WALLET_JWKS_CACHE_REFRESH_FREQUENCY   | After what time a new JWKS version should be loaded |
| WALLET_SECRET_BOX_HEX_KEY             | A key used to decrypt `extra` field in JWT. The production keys should be strictly confidential |

### Open API

| Env Variable | Meaning |
|----------|-------------|
| WALLET_OPEN_API_SERVER_URL | Where requests from Open API UI will be sent when using 'Try it out' option |

### Database

| Env Variable | Meaning |
|----------|-------------|
| WALLET_DB_ADDRESS | Postgres host address |
| WALLET_DB_PORT | Postgres port |
| WALLET_DB_NAME | Postgres database name where the currencies and transactions are stored |
| WALLET_DB_USERNAME | Username of the user who can write and read from the above database |
| WALLET_DB_PASSWORD | Password of the above user |
| WALLET_DB_NUM_THREADS | Database operations thread pool |
| WALLET_DB_MAX_CONNECTIONS | Max number of db connections in the pool |
| WALLET_DB_MIN_CONNECTIONS | Min number of db connections in the pool |
| WALLET_TRANSACTION_READ_DB_ADDRESS | Postgres host address used to fetch transaction history |
| WALLET_TRANSACTION_READ_DB_PORT | Postgres port used to fetch transaction history |
| WALLET_TRANSACTION_READ_DB_NAME | Postgres database name from which transactions are fetched |
| WALLET_TRANSACTION_READ_DB_USERNAME | Username of the user who can read from the above database |
| WALLET_TRANSACTION_READ_DB_PASSWORD | Password of the above user  |
| WALLET_TRANSACTION_READ_DB_NUM_THREADS | Database operations thread pool |
| WALLET_TRANSACTION_READ_DB_MAX_CONNECTIONS | Max number of db connections in the pool |
| WALLET_TRANSACTION_READ_DB_MIN_CONNECTIONS | Min number of db connections in the pool |

### Logs

| Env Variable | Meaning |
|----------|-------------|
| LOGGING_USE_JSON | Whether logs should be appended using LoggingEventCompositeJsonEncoder |
| WALLET_AKKA_LOG_LEVEL | Akka-specific log level |
