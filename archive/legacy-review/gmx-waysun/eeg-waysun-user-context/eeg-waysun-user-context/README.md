# stella-user-context

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
    - [User Context Server](#user-context-server)
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

This will make sure that a ticket number present in a branch name (e.g. `feature/SP-495-bootstrap-project`) will also
be automatically reflected in the commit messages (
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
in `user-context/conf/liquibase/changelog.xml`. Liquibase migrations are idempotent operations so they can be executed
multiple times.

```shell script
docker-compose -f resources/docker-compose/docker-compose.yml up stella-user-context-liquibase
```

## Build & Run Locally via Docker Image

To build:

```shell script
sbt docker:publishLocal
```

To run via Docker

1. Start `gmx-traefic` by executing `docker-compose up -d` from `gmx-traefic` repository

2. Start `user-context`:

   ```shell script
   cd resources/docker-compose
   docker-compose up -d
   ```

   Or:

   ```shell script
   cd resources/docker-compose
   docker-compose up -d user-context
   ```

## Run Locally via sbt

```shell script
sbt user-context/run
```

It's also possible to run the server using IntelliJ Ultimate.

Once the server is up, you can open `http://localhost:14000/user-context_docs` to see Open API definition (which also
can be used in an interactive way to send the requests). The service uses JWT and verifies user's permissions, so it's
needed to pass Bearer token in Authorization header. This can be disabled in config
via `stella.user-context.server.jwt.require-jwt-auth`. The expected, custom JWT structure is
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
--url=jdbc:postgresql://${USER_CONTEXT_DB_ADDRESS}:${USER_CONTEXT_DB_PORT}/${USER_CONTEXT_DB_NAME} \
--username=${USER_CONTEXT_LIQUIBASE_DB_USERNAME} \
--password=${USER_CONTEXT_LIQUIBASE_DB_PASSWORD} \
update
```

Obviously the env variables need to be replaced with the correct values. The default values used in the dev mode are:

```shell script
USER_CONTEXT_DB_ADDRESS=postgres
USER_CONTEXT_DB_PORT=5432
USER_CONTEXT_DB_NAME=user_context
USER_CONTEXT_LIQUIBASE_DB_USERNAME=user_context_liquibase
USER_CONTEXT_LIQUIBASE_DB_PASSWORD=user_context_liquibase
```

## Configuration

We use Typesafe Config to configure the behaviour of the application. It allows the devs and the admins to override the
default value via environment variables.

### User Context Server

| Env Variable | Meaning |
|----------|-------------|
| USER_CONTEXT_HOST | Host on which the server should be available |
| USER_CONTEXT_PORT | Port on which the server should be available |
| USER_CONTEXT_PLAY_SECRET_KEY | The secret key is used to sign Play's session cookie. This must be changed for production |
| USER_CONTEXT_ENTITY_ASK_TIMEOUT | How long endpoints should wait for response from user context entity in Actor cluster |
| USER_CONTEXT_START_AKKA_MANAGEMENT_AND_CLUSTER_BOOTSTRAP | Needed when forming Akka cluster with Kubernetes |

### JWT

| Env Variable | Meaning |
|----------|-------------|
| USER_CONTEXT_REQUIRE_JWT_AUTH | Whether content of Authorization Bearer token should be validated |
| USER_CONTEXT_TEST_USER_ID | Used instead of a value from JWT when JWT auth is disabled |
| USER_CONTEXT_TEST_PROJECT_ID | Used instead of a value from JWT when JWT auth is disabled |
| JWT_SERVICE_DISCOVERY_URI | A prefix that must be present in the JWT token's `iss` field |
| JWT_INTERNAL_SERVICE_DISCOVERY_URI | Where the server should look for required issuer and JWKS URI |
| USER_CONTEXT_ISSUER_CACHE_REFRESH_FREQUENCY | After what time a new value of an issuer property should be read from the service discovery endpoint |
| USER_CONTEXT_JWKS_CACHE_REFRESH_FREQUENCY | After what time a new JWKS version should be loaded |
| USER_CONTEXT_SECRET_BOX_HEX_KEY | A key used to decrypt `extra` field in JWT. The production keys should be strictly confidential |

### Open API

| Env Variable | Meaning |
|----------|-------------|
| USER_CONTEXT_OPEN_API_SERVER_URL | Where requests from Open API UI will be sent when using 'Try it out' option |

### Database

| Env Variable | Meaning |
|----------|-------------|
| USER_CONTEXT_DB_ADDRESS | Postgres host address |
| USER_CONTEXT_DB_PORT | Postgres port |
| USER_CONTEXT_DB_NAME | Postgres database name where the aggregates are stored |
| USER_CONTEXT_DB_USERNAME | Username of the user who can modify the above database |
| USER_CONTEXT_DB_PASSWORD | Password of the above user |

### Logs

| Env Variable | Meaning |
|----------|-------------|
| LOGGING_USE_JSON | Whether logs should be appended using LoggingEventCompositeJsonEncoder |
