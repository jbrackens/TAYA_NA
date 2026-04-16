# Phoenix

This is the mono-repo that contains everything you need to develop/run the Phoenix Backend.

## Table of Contents

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
<!-- To install doctoc run `npm install -g doctoc`, to use it run `doctoc <this-file-path>` -->

- [Developer Tooling](#developer-tooling)
  - [1Password resources](#1password-resources)
    - [Alternative to 1Password](#alternative-to-1password)
  - [Git](#git)
    - [Hooks](#hooks)
    - [Merging changes](#merging-changes)
      - [Integrating a PR into `develop`](#integrating-a-pr-into-develop)
      - [Automated merges](#automated-merges)
      - [Releasing `develop` to `master`](#releasing-develop-to-master)
      - [Hotfixes and backports](#hotfixes-and-backports)
  - [Java 11](#java-11)
  - [VPN](#vpn)
  - [IntelliJ](#intellij)
  - [sbt](#sbt)
    - [Logs](#logs)
    - [Scalafix](#scalafix)
  - [Docker](#docker)
    - [TestContainers setup](#testcontainers-setup)
  - [.env files support](#env-files-support)
- [Build, run & deploy](#build-run--deploy)
  - [Start external dependencies with docker-compose](#start-external-dependencies-with-docker-compose)
    - [Postgres + Flyway migrations (services `postgres` and `flyway`)](#postgres--flyway-migrations-services-postgres-and-flyway)
      - [Postgresql + testcontainers](#postgresql--testcontainers)
    - [Keycloak (service `keycloak`)](#keycloak-service-keycloak)
    - [Kafka (service `cp-broker`)](#kafka-service-cp-broker)
    - [Kafka UI (service `kafka-topics-ui`)](#kafka-ui-service-kafka-topics-ui)
    - [SFTP (service `sftp-server`)](#sftp-service-sftp-server)
  - [Modify configuration to enable/disable JWT authentication](#modify-configuration-to-enabledisable-jwt-authentication)
  - [Add dev environment variables for Twilio](#add-dev-environment-variables-for-twilio)
  - [Run the system as a single Akka cluster](#run-the-system-as-a-single-akka-cluster)
    - [Create test accounts](#create-test-accounts)
  - [Run Gatling Tests](#run-gatling-tests)
    - [Run locally in sbt](#run-locally-in-sbt)
  - [Run contract tests](#run-contract-tests)
    - [Against virginia-dev from a local machine](#against-virginia-dev-from-a-local-machine)
    - [Against local phoenix-backend from a local machine](#against-local-phoenix-backend-from-a-local-machine)
  - [Run the Phoenix Oddin Ingestor](#run-the-phoenix-oddin-ingestor)
  - [Run the Phoenix Betgenius Ingestor](#run-the-phoenix-betgenius-ingestor)
  - [Deploy Cloudflow applications to dev environment](#deploy-cloudflow-applications-to-dev-environment)
    - [Prerequisites](#prerequisites)
    - [Phoenix Oddin Ingestor](#phoenix-oddin-ingestor)
    - [Phoenix Betgenius Ingestor](#phoenix-betgenius-ingestor)
    - [Consuming Kafka Messages from Cloudflow Applications](#consuming-kafka-messages-from-cloudflow-applications)
    - [Tournament operations](#tournament-operations)
      - [Get tournaments (with pagination and ordering by startTime)](#get-tournaments-with-pagination-and-ordering-by-starttime)
      - [Show tournament by tournamentId](#show-tournament-by-tournamentid)
      - [Hide tournament by sportId and tournamentId](#hide-tournament-by-sportid-and-tournamentid)
      - [Disable a single game by sportId and fixtureId](#disable-a-single-game-by-sportid-and-fixtureid)
- [Environments](#environments)
  - [URLs, 1Password vaults, 3rd party integrations](#urls-1password-vaults-3rd-party-integrations)
  - [Deployment details](#deployment-details)
  - [Kubernetes access (all envs)](#kubernetes-access-all-envs)
  - [Virginia-dev Environment](#virginia-dev-environment)
    - [Accessing virginia-dev ArgoCD](#accessing-virginia-dev-argocd)
    - [Updating virginia-dev ArgoCD Applications](#updating-virginia-dev-argocd-applications)
    - [Connecting to virginia-dev database](#connecting-to-virginia-dev-database)
    - [Connecting to virginia-dev Keycloak](#connecting-to-virginia-dev-keycloak)
    - [Accessing virginia-dev postgresql slow-logs](#accessing-virginia-dev-postgresql-slow-logs)
    - [Accessing virginia-dev Kamon status page](#accessing-virginia-dev-kamon-status-page)
    - [Connecting to virginia-dev Grafana](#connecting-to-virginia-dev-grafana)
    - [Creating test accounts on virginia-dev](#creating-test-accounts-on-virginia-dev)
  - [Outpost-stg Environment](#outpost-stg-environment)
    - [Accessing outpost-stg ArgoCD](#accessing-outpost-stg-argocd)
    - [Updating outpost-stg ArgoCD Applications](#updating-outpost-stg-argocd-applications)
    - [Connecting to outpost-stg database](#connecting-to-outpost-stg-database)
    - [Connecting to outpost-stg Keycloak](#connecting-to-outpost-stg-keycloak)
    - [Accessing outpost-stg Kamon status page](#accessing-outpost-stg-kamon-status-page)
    - [Connecting to outpost-stg Grafana](#connecting-to-outpost-stg-grafana)
    - [Creating test accounts on outpost-stg](#creating-test-accounts-on-outpost-stg)
  - [Outpost-prd Environment](#outpost-prd-environment)
    - [Accessing outpost-prd ArgoCD](#accessing-outpost-prd-argocd)
    - [Updating outpost-prd ArgoCD Applications](#updating-outpost-prd-argocd-applications)
    - [Connecting to outpost-prd database](#connecting-to-outpost-prd-database)
    - [Connecting to outpost-prd Keycloak](#connecting-to-outpost-prd-keycloak)
    - [Accessing outpost-prd Kamon status page](#accessing-outpost-prd-kamon-status-page)
    - [Connecting to outpost-prd Grafana](#connecting-to-outpost-prd-grafana)
    - [Creating test accounts on outpost-prd](#creating-test-accounts-on-outpost-prd)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Developer Tooling

## 1Password resources

* GeoComply: `GeoComply:StagingEnv`
* Oddin: `oddin:data-feed`
* PXP (payments): `pxp-financial:darkstormlabs:phoenix:test-user-password`
* Sendgrid: `sendgrid:api-key:phoenix:dev`
* SFTP: `sftp::phoenix-dev:argyll-sftp-srv01:argyll-replica`
* Test users password: `phoenix:dev:test-users-password`
* Twilio: `phoenix:dev:twilio`

### Alternative to 1Password

Sometimes, it may turn out that the 1Password resource you are looking for does not exist or (even worse) is invalid.
In a situation like this, the surefire way is to extract the environment variable/secret directly from the dev Kubernetes cluster.

You will need to configure k8s and AWS (see [Kubernetes access (all envs)](#kubernetes-access-all-envs)).

Extract the secrets using `kubectl get secrets` like this:
```shell
kubectl get secret phoenix-backend-secrets --namespace phoenix -o go-template='{{range $k,$v := .data}}{{printf "%s: " $k}}{{if not $v}}{{$v}}{{else}}{{$v | base64decode}}{{end}}{{"\n"}}{{end}}'
```


## Git

### Hooks

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
# from top-level directory of the project
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that the ticket number present in branch name (e.g. `chore/PHXD-518-oddin-deploy-from-ci`)
will also be automatically reflected in the commit messages (e.g. `[PHXD-518] Deploy phoenix-oddin from CI`).

### Merging changes

#### Integrating a PR into `develop`

- rebase, fast-forward (`git merge --ff-only`), squash: OK, all allowed since they retain linear history
- 2-parent aka _true_ merge (`git merge --no-ff`): discouraged, coz it tangles up the history

#### Automated merges

[Auto-merges](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request) are configured for this repository.
Once auto-merge is enabled (near the Merge button) for the given PR,
it will get merged automatically once it passes CI check and receives an approval.

Note that the branch must be up to date with `develop` to be merged.
We didn't go for [Mergify](https://mergify.com) due to the high cost.
For automating the rebase-onto-develop/merge-develop-into & push-to-origin workflow on your local machine,
you can use [git-machete CLI](https://github.com/VirtusLab/git-machete#git-machete)
or [git-machete IntelliJ plugin](https://github.com/VirtusLab/git-machete-intellij-plugin#git-machete-intellij-plugin).

#### Releasing `develop` to `master`

To release `develop` to `master`:

1. Run the `prepare_release_pr.sh` script which will create a release branch (e.g. `release/2022-06-23_09-36`) and open a release PR:
   ```shell
   dev/prepare_release_pr.sh
   ```
2. Follow the instructions on the [How to Create a Release](https://eegtech.atlassian.net/wiki/spaces/GMX3/pages/10396041217/How+to+Create+a+Release)
   Confluence page. These include all the required Jira, Confluence etc steps all the way through to deploying to `PRD`.
   **Warning!**
   Once the PR gets approved and the build passes, do **NOT** press the Merge button in GitHub UI!
   The Merge button only offers squash, rebase or true merge options, but **not** fast-forward.
   Instead, do:
   ```shell
   git checkout master
   git merge --ff-only release/2022-06-23_09-36  # Replace branch name adequately
   git push -u origin master
   ```

This will also lead to the PR getting merged, since GitHub will recognize that the head branch `release/2022-06-23_09-36` is now merged to the base branch `master`
&mdash; even though Merge button has NOT been pressed.

#### Hotfixes and backports

It might sometimes be necessary to cherry-pick certain changes from `develop` into `master`
but **without** integrating the entire `develop` directly into master.
See [PR #1730](https://github.com/flipadmin/phoenix-backend/pull/1730) for a complex example where 3 non-consecutively-merged PRs
have been `git cherry-pick`ed from `develop` into `master`.

See [Updating virginia-dev ArgoCD applications](#updating-virginia-dev-argocd-applications) for how to do non-automatic releases.

For the hotfix PR to `master` itself, apply the same merge strategy as for a regular PR to `develop`:

- rebase, fast-forward (`git merge --ff-only`), squash: OK, all allowed since they retain linear history
- 2-parent aka _true_ merge (`git merge --no-ff`): discouraged, coz it tangles up the history

Then, once the hotfix PR is integrated into `master`, open a **backport PR** to make sure that `master` and `develop` no longer remain diverged,
i.e. that `develop` commit becomes a descendant of `master` commit again.
See [PR #1780](https://github.com/flipadmin/phoenix-backend/pull/1780) for an example.

To backport the merged hotfix from `master` to `develop`:
1. Make sure that your local `master` and `develop` include the latest changes:
   ```shell
   git checkout master
   git pull origin master
   git checkout develop
   git pull origin develop
   ```
2. Create a branch (e.g. `backport/1778`) out of `develop`: `git checkout -b backport/1778 develop`.
3. Merge `master` into this newly-created branch: `git merge --no-edit --strategy=ours master`.
   Note that this will be a true aka 2-parent merge and **not** a fast-forward one, since `develop` and `master` diverged (neither is descendant of another at this point).
   Using `ours` merge strategy guarantees that the file contents recorded in the merge commit will be identical to `develop` (see `git diff develop`).
4. Push `backport/1778` and create a PR to `develop`.
   Since we want `develop` to become a descendant of `master`, we need to add a new merge commit to `develop`, not to `master`.
5. Do NOT press the Merge button in GitHub UI!
   Merge button only offers squash, rebase or true merge options, but not fast-forward.
6. Instead, **once the backport PR receives an approval and the build for that PR passes**,
   run `git checkout develop && git merge --ff-only backport/1778 && git push -u origin develop`.

This will also lead to the backport PR getting merged, since GitHub will recognize that the head branch `backport/1778` is now merged to the base branch `develop`
&mdash; even though Merge button has NOT been pressed.


## Java 11

The project team are all using the same JDK distribution for development. This is the OpenJDK 11 build with Hotspot VM.

It's recommended to use a tool that allows you to manage multiple JDKs on your development machine,
e.g. [jenv](https://www.jenv.be/) or [sdkman](https://sdkman.io/).

If you're using `jenv` then you can:

```shell script
brew tap homebrew/cask-versions
brew install --cask temurin11
jenv add /Library/Java/JavaVirtualMachines/temurin-11.jdk/Contents/Home
```

`sdkman` makes it even easier:

```shell script
sdk ls java | grep '\-tem'
sdk install java 11.<latest version>-tem
```


## VPN

To resolve certain dependencies (for instance, [Oddin's](https://oddin.gg/) Odds Feed SDK)
and to connect to Kubernetes clusters, you must be on company VPN.
See the the [Confluence page](https://eegtech.atlassian.net/wiki/spaces/BDS/pages/10362093569/Login+on+VPN) for instructions.


## IntelliJ

Other than [Scala plugin](https://plugins.jetbrains.com/plugin/1347-scala), consider installing the following plugins as well:
* [Apache Avro IDL Schema Support](https://plugins.jetbrains.com/plugin/15728-apache-avro-idl-schema-support)
* [Go Template](https://plugins.jetbrains.com/plugin/10581-go-template) for Helm templates
* [HOCON](https://plugins.jetbrains.com/plugin/10481-hocon) for .conf file support
* [.ignore](https://plugins.jetbrains.com/plugin/7495--ignore), especially to exclude git-ignored files from search
* [Kubernetes](https://plugins.jetbrains.com/plugin/10485-kubernetes)

Due to limitations of IntelliJ, we cannot use some scala flags when compiling project using IntelliJ compiler, due to inability of removing them from test compilation.
As a workaround, sbt build allows disabling these flags by passing `-Dintellij=true` VM parameter.

To enable this mode, open sbt window under:

`Settings | Build, Execution, Deployment | Build Tools | sbt`

and add in `VM parameters`: `-Dintellij=true -Xss2M -Xmx5120M`.


## sbt

### Logs

You can enable logs in tests from command line by system property
`sbt -Dlogback.root.level=INFO test`


### Scalafix

We use Scalafix to guarantee an automated code quality standard. Including, but not limited to, organizing imports.

Before submitting a PR (or, better said, before attempting to pass the CI), Scalafix rules should be applied. To do that, run:

```shell script
sbt scalafixAll
```

You can check locally whether the rules are passed by doing:

```shell script
sbt "scalafixAll --check"
```

A full set of rules required by scalafix and scalafmt can be applied to your code by:
```shell
sbt scalafmtAll scalafmtSbt scalastyle scalafixAll
```


## Docker

Install Docker and docker-compose.

### TestContainers setup

To make sure that integration tests reuse the Docker containers, put `testcontainers.reuse.enable=true`
into `.testcontainers.properties` file in the home directory.


## .env files support

For various functionalities you might require setting environment variables.
Some variables are listed in `.env.template` file, full list is available by running:

```shell
./ci/list_env_vars_referenced_from_paths_matching_regex.sh '.*(\.conf|logback.*\.xml)'
```

You have various options to define those:

1. Exporting globally (e.g. `export ODDIN_ACCESS_TOKEN=...`) <br/>
   But it's problematic then to work with different environments, or with different projects that might have common variable names.
2. Setting before running sbt (e.g. `ODDIN_ACCESS_TOKEN=... sbt compile`) <br/>
   Note that this approach is hard if you need to set multiple at once.
   Also, it might not work well with IDEs unless you explicitly provide them the correct environment
   (e.g. by running IntelliJ as `ODDIN_ACCESS_TOKEN=... idea` from the command line).
3. Using a tool like https://direnv.net/ that enables a "local-exported" environment in shell.
   To prepare input file you can use `.env.template` as a reference.
   Note that this approach might not work for `Run/Debug` from IDE.
4. For IntelliJ (and probably other IDEs also), there is nice support for loading `.env` files: https://github.com/Ashald/EnvFile.
   To prepare input file you can use `.env.template` as a reference.
   Note that this approach uses slightly different file format than `direnv` (without `export ...`),
   but it's possible to add extension to it that will parse the file: https://direnv.net/#faq
   Unfortunately some `Run/Debug` dialogs (e.g. for `SBT task`) does not present `EnvFile` tab, and does not load variables.
5. For SBT specifically, there is a plugin for loading `.env` files: https://github.com/mefellows/sbt-dotenv.
   To prepare input file you can use `.env.template` as a reference.
   Note that this plugin supports both the format with or without `export ...` so it's compatible with both `direnv` and `EnvFile`.
   Please see `build.sbt` for details, but you can specify a file to be loaded using `-Ddotenv.file=<filename>` in command line invocation.
   This works both from CLI and IntelliJ SBT `Run/Debug` dialog.
   Unfortunately plugin does not report misconfiguration/missing file, but when it succeeds you should expect:

```
[info] Configured .env environment
```

With this various of options, what should a developer pick? :)
We do not want to enforce the approach, some ppl prefer `export` in CLI, some `direnv`. We can just suggest a setup here:
1. Creating `.<specifier>.env` filed locally if a set of variables is needed - those files are ignored by git with current configuration
2. The most common file format is without `export ...`:

   - most tools use that format, not only mentioned above, but also docker-compose: https://docs.docker.com/compose/environment-variables/#the-env_file-configuration-option
     Yes, we do have a setup currently only with infra, but anyone can wire up local Akka cluster on multiple JVMs now when we stopped supporting kind.
   - for bigger files, there is a linter support: https://github.com/dotenv-linter/dotenv-linter
   - for `direnv` it's possible to add simple extension that will cope with slightly different format
   - or just go with simple `set -o allexport; source conf-file; set +o allexport`
3. `sbt-dotenv` plugin seems most flexible as it works both from CLI and IntelliJ, it requires one extra setting, but it is a reasonable tradeoff.
   Additionally, keeping this verbose make it a little more secured from accidentally using wrong configuration (e.g. connecting to real ENV with a new feature from local).

Consider placing your \*.env file filled up with passwords outside of main project directory
&mdash; so you will not risk committing it (or any copy thereof) to the repo (albeit \*.env are git-ignored for security).
You can place it in the parent directory and reference it by `../file.env`.



# Build, run & deploy

To build and run the system locally:

<!-- This section is COPIED from TOC on top -->

- [Start external dependencies with docker-compose](#start-external-dependencies-with-docker-compose)
- [Modify configuration to enable/disable JWT authentication](#modify-configuration-to-enabledisable-jwt-authentication)
- [Add dev environment variables for Twilio](#add-dev-environment-variables-for-twilio)
- [Run the system as a single Akka cluster](#run-the-system-as-a-single-akka-cluster)
- [Run the Phoenix Oddin Ingestor](#run-the-phoenix-oddin-ingestor)

## Start external dependencies with docker-compose

These external docker-compose dependencies include:

- a Postgres server (with databases configured)
- a Keycloak server (with postgres backend)
- a Kafka server
- a SFTP server

Run the `docker-compose.yaml` file found in the `dev` directory. <br/>

```shell script
cd dev
docker-compose up
```

You can also run independent services by simply specifying the names: <br/>

```shell script
cd dev
docker-compose up <service1> <service2>
```

### Postgres + Flyway migrations (services `postgres` and `flyway`)

```
docker-compose up postgres flyway
```

This will start containers running Postgres and execute the Flyway migrations found in `services/src/main/resources/db/migration`.

The first time the container runs it will setup all the necessary users/databases/tables/sequences etc. within `dev/.postgres` directory. <br/>
Note that this directory will be created by Docker container with `uid=999`, `gid=0 (root)`, `mode=rwx------`, so you'll need `sudo` for access/removal.

To connect to the Dockerized database from the host, use `PGPASSWORD=backend psql -h localhost -p 5432 -U backend -d backend`.

You can also run just `postgres` service, and it will skip migrations.

#### Postgresql + testcontainers

To connect to the latest database used by tests from testcontainers, check which port it is mapped to on your local machine:
`docker ps` or `docker ps |grep postgres`. Look for a section PORTS with mapping like `0.0.0.0:49154->5432/tcp,`. This means our psql port is 49154.

Now you can find the latest database used by test
```bash
PGPASSWORD=backend psql -h localhost -p 49154 -U backend --list|egrep 'phoenix_[0-9]+_.+superuser'|tail -1|awk '{print $1}'
phoenix_1639509505_eq6HQV
```
and connect to it:

`PGPASSWORD=backend psql -h localhost -p 49154 -U backend -d phoenix_1639509505_eq6HQV`

Both commands can be combined for a single call:
```bash
PORT=49154; PGPASSWORD=backend psql -h localhost -p $PORT -U backend -d $(PGPASSWORD=backend psql -h localhost -p $PORT -U backend --list|egrep 'phoenix_[0-9]+_.+superuser'|tail -1|awk '{print $1}')
```

### Keycloak (service `keycloak`)

```
docker-compose up keycloak
```

This will start container with keycloak, that will connect to Postgres container to use it for persistence.
The first time the application is run locally, it will create and configure required keycloak realm automatically.

If you want to use admin panel, open in browser: `localhost:8080` and log in with username/password `admin`/`admin`.

To connect to the Dockerized Keycloak's database from the host, use `PGPASSWORD=backend psql -h localhost -p 5432 -U backend -d keycloak`.

### Kafka (service `cp-broker`)

This will start containers necessary for Kafka (including Zookeeper and Brokers).

If you want to connect to Kafka using CLI it's available on default port on `localhost:9092`.

### Kafka UI (service `kafka-topics-ui`)

This will start containers necessary for Lenses Kafka Topic UI (includes also `cp-broker`).

To see the local Kafka deployment go to the Lenses Kafka Topic UI in a browser: http://localhost:8085/.

### SFTP (service `sftp-server`)

This will start SFTP container.

To connect to the Dockerized SFTP server use `sftp://backend:backend@localhost:2222`

## Modify configuration to enable/disable JWT authentication

By default `phoenix-backend` requires JWT authentication to access its Web Socket routes.
This means that calls to the `web-socket` endpoint, as well as the messages it receives, require a valid JWT token (that can be obtained via `phoenix-backend`).
This could be troublesome for debugging in some cases, so it can be disabled by setting `phoenix.jwt.require-jwt-authentication` to `false` in [services/src/main/resources/jwt.conf](services/src/main/resources/jwt.conf).

## Add dev environment variables for Twilio

Set `TWILIO_AUTH_TOKEN` environment variable (see [1Pass resources](#1password-resources)).

## Run the system as a single Akka cluster

1. Set `ODDIN_ACCESS_TOKEN` environment variable (see [1Pass resources](#1password-resources)).
2. Make sure you're on the company VPN (this is required to enable AMQP connection to Oddin data feed)
3. Run `sbt "phoenix-backend/runMain phoenix.main.LocalClusterApplication"`

- If you have Kafka set up locally with docker-compose, and if you run the Phoenix Oddin runner (see below), then you can consume market data from Kafka (instead of directly from Oddin) by setting environment variable `PHOENIX_ODDIN_KAFKA_INGESTION_ENABLED=yes` and then launching the above SBT command
- Sometimes, you may have problems with docker networking, which will break your network loopback interface (lo0 net interface on Mac OS). You can track this issue when you get errors like "java.net.ConnectException: Can't assign requested address". To solve this issue on Mac OS, you should restart network interfaces: `for i in $(ifconfig | egrep -o "^[a-z].+[0-9]:" | sed 's/://'); do sudo ifconfig "$i" down && sudo ifconfig "$i" up; done`

### Create test accounts

To create test accounts, run `sign_up_users.sh` script:

Example
```shell
./dev/keycloak/sign_up_users.sh
```

Check `dev/keycloak/users/local/passwords_local.yaml` for the usernames and password of the created users.


## Run Gatling Tests

### Run locally in sbt

First you should build and run the application as described in the section in this README [Build, run & deploy](#build-run--deploy).

Then, to launch the Gatling Tests, run the following command:

```shell script
sbt phoenix-load-tests/Gatling/test
```

## Run contract tests

### Against virginia-dev from a local machine

In order to run contract tests against virginia-dev in your local environment you need the following:

- An active VPN in order to access dev environment.
- Credentials extracted from `phoenix-backend-secrets` secret from `phoenix` namespace in `virginia-dev` Kubernetes cluster.

Then, fill up `contract-virginia-dev.env` file (it will NOT be added to git as `*.env` files are ignored):

```shell script
CONTRACT_TESTS_DEV_API_USERNAME=<dev-routes-username>
CONTRACT_TESTS_DEV_API_PASSWORD=<dev-routes-password>
CONTRACT_TESTS_PXP_API_USERNAME=<pxp-username>
CONTRACT_TESTS_PXP_API_PASSWORD=<pxp-password>
```

And run the tests:
```
sbt -Ddotenv.file=contract-virginia-dev.env Contract/test
```

### Against local phoenix-backend from a local machine

Run the app:
```shell
sbt "phoenix-backend/runMain phoenix.main.LocalClusterApplication"
```

And run the tests:
```shell
sbt -Ddotenv.file=contract-local.env Contract/test
```

## Run the Phoenix Oddin Ingestor

There is a separate application that connects to Oddin (one of our external providers of market and sports data). This application ingests data from Oddin and the publishes to Kafka so that the data can be consumed downstream by the Phoenix Backend.

The Phoenix Oddin Ingestor uses the [Cloudflow](https://cloudflow.io/) framework to orchestrate an Akka Streams application. It requires only an SBT plugin to build the application and to run it locally, to build and publish to Kubernetes it requires a CLI application to be available on your `PATH`

Note: as a pre-requisite make sure that the Phoenix Backend Flyway migrations are up to date.

0. Did you make sure that the Phoenix Backend Flyway migrations are up to date?
1. Set `ODDIN_ACCESS_TOKEN` environment variable (see [1Pass resources](#1password-resources)).
2. Make sure you're on the company VPN (this is required to enable AMQP connection to Oddin data feed)
3. Run `sbt phoenix-ingestion-oddin/runLocal`

Note: a useful way to debug what is happening with the publishing to Kafka locally is to install the [kafkacat tool](https://github.com/edenhill/kafkacat) and connect to the relevant Kafka topic. E.g.:

```
$ kafkacat -b localhost:9092 -t phoenix-intake.oddin-market-odds
```

## Run the Phoenix Betgenius Ingestor

Betgenius Ingestor is a cloudflow application that is consuming data sent by Genius Sports data feed.

The Phoenix Betgenius Ingestor uses the [Cloudflow](https://cloudflow.io/) framework to orchestrate an Akka Streams application. It requires only an SBT plugin to build the application and to run it locally, to build and publish to Kubernetes it requires a CLI application to be available on your `PATH`

To start Betgenius Ingestor run following command:

```
sbt phoenix-ingestion-betgenius/runLocal
```

After Betgenius Ingestor is started, you can post data to locally running http server, e.g.:

```
curl --location --request POST 'http://localhost:3000/ingest' \
--header 'Content-Type: application/json' \
--data-raw '{"Fixture":{"Competition":{"Id":13745,"Name":"[FIFA] eSports Battle","Region":{"Id":3795074,"Name":"FIFA"}},"Competitors":[{"CompetitorType":"Team","Competitors":[],"HomeAway":"Home","Id":1288944,"Name":"Atletico Madrid (NicolasRage)"},{"CompetitorType":"Team","Competitors":[],"HomeAway":"Away","Id":1301010,"Name":"Borussia Dortmund (YoungDaddy)"}],"FixtureType":"Match","Id":8565263,"Name":"Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)","Round":{"Id":757684,"Name":"Regular Season"},"Season":{"Id":117073,"Name":"2021 [FIFA] eSports Battle October"},"Sport":{"Id":10915624,"Name":"eSports"},"StartTimeUtc":"2021-10-08T14:12:00Z","Status":"Scheduled"},"Header":{"MessageGuid":"e373b43c-4649-46e1-a317-970759cfdcc6","Retry":0,"TimeStampUtc":"2021-10-08T14:13:44.7671916Z"}}'
```

## Deploy Cloudflow applications to dev environment

### Prerequisites

Data pipelines are using [Cloudflow](https://cloudflow.io/) framework to implement and deploy streaming applications.

To deploy cloudflow aplications, you need to install cloudflow kubectl operator. Please refer to [instructions](https://cloudflow.io/docs/current/get-started/prepare-development-environment.html#_download_and_install_the_cloudflow_cli)

### Phoenix Oddin Ingestor

This requires the Ingestor to be built using the Cloudflow plugin and the resulting Docker images published to a Docker repository available to the dev cluster. After that the application can be deployed using the Cloudflow Kubectl plugin.

```shell script
# Login to ECR
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 461765575148.dkr.ecr.eu-central-1.amazonaws.com
# Build the Cloudflow deployable images and generate the Cloudflow configuration
./k8s-operations/build_cloudflow_app_image_and_publish_to_ecr.sh 461765575148.dkr.ecr.eu-central-1.amazonaws.com

# ...
# output will end with...
# ...

[info] Successfully built and published the following image:
[info] 259420793117.dkr.ecr.eu-west-1.amazonaws.com/phoenix-ingestion-oddin-streamlet@sha256:c2180c133d8342a9e055f40bfaf6c790129178cc280625484925d16f7e84bae9
[success] Cloudflow application CR generated in /Users/tbm/projects/flip/phoenix-3/target/phoenix-ingestion-oddin-pipeline.json
[success] Use the following command to deploy the Cloudflow application:
[success] kubectl cloudflow deploy /Users/tbm/projects/flip/phoenix-3/target/phoenix-ingestion-oddin-pipeline.json
[success] Total time: 27 s, completed 1 Dec 2020, 13:32:58

# Deploy the application using the kubectl plugin
kubectl cloudflow deploy --namespace cloudflow --no-registry-credentials --conf data-pipeline/oddin/pipeline/deploy/remote/values.conf target/phoenix-ingestion-oddin.json -v debug
```

Once deployment has started you can use `kubectl cloudflow status phoenix-ingestion-oddin` to get the current status of the application (or just `kubectl get pods` to see the state of the pods running the streamlets)

### Phoenix Betgenius Ingestor

This requires the Betgenius Ingestor to be built using the Cloudflow plugin and the resulting Docker images published to a Docker repository available to the dev cluster. After that the application can be deployed using the Cloudflow Kubectl plugin.

```shell script
# Login to ECR
aws ecr get-login-password --region eu-central-1 | docker login --username AWS --password-stdin 461765575148.dkr.ecr.eu-central-1.amazonaws.com
# Build the Cloudflow deployable images and generate the Cloudflow configuration
./k8s-operations/build_cloudflow_app_image_and_publish_to_ecr.sh 461765575148.dkr.ecr.eu-central-1.amazonaws.com

# ...
# output will end with...
# ...

[info] Successfully built and published the following image:
[info] 461765575148.dkr.ecr.eu-central-1.amazonaws.com/phoenix-ingestion-betgenius@sha256:88a7ff4c4c6bd597c785c8a323064c657d867ba221ac3b78b1643c9527cc876c

# Deploy the application using the kubectl plugin
kubectl cloudflow deploy --namespace cloudflow --no-registry-credentials  target/phoenix-ingestion-betgenius.json -v debug
```

Once deployment has started you can use `kubectl cloudflow status phoenix-ingestion-betgenius` to get the current status of the application (or just `kubectl get pods` to see the state of the pods running the streamlets)

To publish a message to betgenius http ingress, forward port to betgenius http ingress service:

```shell script
kubectl get services -n cloudflow
# Find correct service name, containing betgenius-http, at the moment of writing following command should be correct
kubectl port-forward -n cloudflow service/phoenix-ingestion-betgenius-betgenius-http-ingestor-service 3000:3000
```

and send ingest:

```shell script
curl --location --request POST 'http://localhost:3000/ingest' \
--header 'Content-Type: application/json' \
--data-raw '{"Fixture":{"Competition":{"Id":13745,"Name":"[FIFA] eSports Battle","Region":{"Id":3795074,"Name":"FIFA"}},"Competitors":[{"CompetitorType":"Team","Competitors":[],"HomeAway":"Home","Id":1288944,"Name":"Atletico Madrid (NicolasRage)"},{"CompetitorType":"Team","Competitors":[],"HomeAway":"Away","Id":1301010,"Name":"Borussia Dortmund (YoungDaddy)"}],"FixtureType":"Match","Id":8565263,"Name":"Atletico Madrid (NicolasRage) v Borussia Dortmund (YoungDaddy) (Bo1)","Round":{"Id":757684,"Name":"Regular Season"},"Season":{"Id":117073,"Name":"2021 [FIFA] eSports Battle October"},"Sport":{"Id":10915624,"Name":"eSports"},"StartTimeUtc":"2021-10-08T14:12:00Z","Status":"Scheduled"},"Header":{"MessageGuid":"e373b43c-4649-46e1-a317-970759cfdcc6","Retry":0,"TimeStampUtc":"2021-10-08T14:13:44.7671916Z"}}'
```

### Consuming Kafka Messages from Cloudflow Applications

To consume messages sent between streamlets or sent to final kafka topics, you can use `kafkacat` docker image:

```shell script
kubectl run kafka-consumer -n cloudflow -ti --image=confluentinc/cp-kafkacat --rm=true --restart=Never -- kafkacat -b phoenix-strimzi-kafka-bootstrap.cloudflow:9092 -t <topic>
```

To get list of topic available you can use following command:

```shell script
kubectl get kafkatopics -n cloudflow
```

For example to consume valid betgenius json messages sent between http ingress and converter streamlets use following command:

```shell script
kubectl run kafka-consumer -n cloudflow -ti --image=confluentinc/cp-kafkacat --rm=true --restart=Never -- kafkacat -b phoenix-strimzi-kafka-bootstrap.cloudflow:9092 -t phoenix-intake.betgenius-http-valid
```

To consume betgenius fixture events use following command:

```shell script
kubectl run kafka-consumer -n cloudflow -ti --image=confluentinc/cp-kafkacat --rm=true --restart=Never -- kafkacat -b phoenix-strimzi-kafka-bootstrap.cloudflow:9092 -t phoenix-intake.betgenius-fixtures
```

Please note that fixture events are avro encoded. At the moment we are not using schema registry so it's not possible to consume these messages using avro decoder - current output will be somewhat malformed.

### Tournament operations

To make these queries, you need to get an authorization token. To get this token, please make a request.

```shell
curl 'https://$API_HOST/login' \
  --data-raw '{"password":"HEAVY_PASSWORD","username":"LOGIN"}' \
  --compressed
```
`API_HOST` can be found in the Confluence doc linked in [URLs, 1Password vaults, 3rd party integrations](#urls-1password-vaults-3rd-party-integrations) section.

In the response, you can find the token:

```shell
{
  "token": {
    "userId": "...",
    "token": "eyJhb...",
...
}
```

Assign this token to an env variable:

```shell
TOKEN=eyJhb...

```
Then you can execute queries depending on the goal:

#### Get tournaments (with pagination and ordering by startTime)

```shell
curl -H "Authorization: Bearer $TOKEN" "https://$API_HOST/fixtures?pagination.itemsPerPage=20&pagination.currentPage=1&ordering.startTime=ASCENDING"
```

#### Show tournament by tournamentId

```shell
curl -X POST -H "Authorization: Bearer $TOKEN" "https://$API_HOST/admin/trading/tournaments/t:o:od:tournament:2114/make-displayable"
```

#### Hide tournament by sportId and tournamentId

```shell
curl -X POST -H "Authorization: Bearer $TOKEN" "https://$API_HOST/admin/trading/tournaments/t:o:od:tournament:2114/make-not-displayable"
```

#### Disable a single game by sportId and fixtureId

```shell
curl -X POST -H "Authorization: Bearer $TOKEN" "https://$API_HOST/admin/trading/sports/s:p:67/fixtures/f:o:od:match:12345" -d "{\"fixtureStatus\": \"POST_GAME\"}"
```


# Environments

## URLs, 1Password vaults, 3rd party integrations

See [Confluence](https://eegtech.atlassian.net/wiki/spaces/GMX3/pages/3092480001/Links+to+environments).


## Deployment details

| Property                                 | virginia-dev                                                                              | outpost-stg                                                                             | outpost-prd                                                                             |
|------------------------------------------|-------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| ArgoCD: URL                              | [argocd.dev.phoenix.darkstormlabs.net](https://argocd.dev.phoenix.darkstormlabs.net/applications)         | (not exposed, use port-forward)                                                         | (not exposed, use port-forward)                                                         |
| ArgoCD: directory in phoenix-argocd repo | [eks-virginia-dev](https://github.com/flipadmin/phoenix-argocd/tree/dev/eks-virginia-dev) | [eks-outpost-stg](https://github.com/flipadmin/phoenix-argocd/tree/dev/eks-outpost-stg) | [eks-outpost-prd](https://github.com/flipadmin/phoenix-argocd/tree/dev/eks-outpost-prd) |
| AWS Account                              | 772258428734 (phoenix-lab)                                                                | 534409234366 (darkstormlabs-org)                                                                  | 534409234366 (darkstormlabs-org)                                                                  |
| Kibana URL                               | [kibana.dev.phoenix.darkstormlabs.net](https://kibana.dev.phoenix.darkstormlabs.net/app/discover)         | [kibana.stg.phoenix.darkstormlabs.net](https://kibana.stg.phoenix.darkstormlabs.net/app/discover)       | [kibana.prd.phoenix.darkstormlabs.net](https://kibana.prd.phoenix.darkstormlabs.net/app/discover)       |
| Underlying machines                      | AWS (us-east-1)                                                                           | Continent8 (AWS Outpost in us-east-1)                                                   | Continent8 (AWS Outpost in us-east-1)                                                   |


## Kubernetes access (all envs)

General Kubernetes prerequisites:

- [fw02-lon VPN connection](#vpn)
- docker
- [helm v3.x](https://helm.sh/docs/intro/install/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

Recommended tooling:
- [kubectx and kubens](https://github.com/ahmetb/kubectx)
- [kube-ps1](https://github.com/jonmosco/kube-ps1)

Optional Cloudflow prerequisite:

- [Cloudflow CLI](https://cloudflow.io/docs/current/get-started/prepare-development-environment.html#_download_and_install_the_cloudflow_cli)

Follow the instructions on [Confluence page](https://eegtech.atlassian.net/wiki/spaces/BDS/pages/2626125848/Connecting+to+the+Phoenix+EKS+clusters).


## Virginia-dev Environment

### Accessing virginia-dev ArgoCD

Make sure the right Kubernetes context is selected first!
We strongly recommend using [kubectx](https://github.com/ahmetb/kubectx) and [kube-ps1](https://github.com/jonmosco/kube-ps1) for that purpose.

```shell
kubectl get secret argocd-initial-admin-secret -n argocd -o jsonpath="{.data.password}" | base64 -d | pbcopy  # or, on Linux: `xclip -selection clipboard`
kubectl port-forward svc/argocd-server 9000:80 -n argocd
```
Then, open [localhost:9000](http://localhost:9000) in the browser, using `admin` as login and paste the password from clipboard.

To access ArgoCD via [argocd CLI](https://argo-cd.readthedocs.io/en/stable/cli_installation/) instead, use:

```shell
argocd login --name="$(kubectx -c)" --username=admin --password="$(kubectl get secret -n argocd argocd-initial-admin-secret -o jsonpath={.data.password} | base64 -d)" --plaintext --port-forward --port-forward-namespace=argocd
```

### Updating virginia-dev ArgoCD Applications

1. Open [phoenix-argocd](https://github.com/flipadmin/phoenix-argocd) repo on `eks-virginia-dev/phoenix-backend.yaml`.
2. Update `spec.source.targetRevision` value to the tag of Helm chart to be deployed
   (basically, version of the application, as derived by `sbt -error "export phoenix-backend/version"`, plus a env-specific suffix
   &mdash; the version can as well be found in the output of the relevant Jenkins `develop/master` build, step `Upload Helm charts`)
3. Push the changes to `dev` branch

ArgoCD will automatically sync the applications within a few minutes.

### Connecting to virginia-dev database

Open a tunnel to the database:
```shell
kubectl port-forward -n postgres-operator "$(kubectl get pod -n postgres-operator -l cluster-name=phoenix-cluster,spilo-role=master -o jsonpath='{.items[0].metadata.name}')" 5432:5432
```

Then you can connect to `localhost:5432` using your tool of choice, providing the credentials from the k8s secret:
```shell
kubectl get secret -n phoenix -o go-template='{{range $k,$v := .data}}{{printf "%s: " $k}}{{if not $v}}{{$v}}{{else}}{{$v | base64decode}}{{end}}{{"\n"}}{{end}}' \
  phoenix-reader-user.phoenix-cluster.credentials.postgresql
```

Please note that you can also use `phoenix-writer-user.*` or `phoenix-owner-user.*` secret instead if you need to perform modifications.

### Connecting to virginia-dev Keycloak

Forward k8s port from virginia-dev environment:

```bash
kubectl port-forward -n keycloak service/keycloak 8443:8443
```

Get the credentials from `credential-keycloak` with:
```shell
kubectl get secret credential-keycloak -n keycloak -o go-template='{{range $k,$v := .data}}{{printf "%s: " $k}}{{if not $v}}{{$v}}{{else}}{{$v | base64decode}}{{end}}{{"\n"}}{{end}}'
```
Go to https://localhost:8443 and log in using the above credentials.

To view all the users click on the _Users_ menu item from the sidebar or go to: https://localhost:8443/auth/admin/master/console/#/realms/phoenix/users.

### Accessing virginia-dev postgresql slow-logs

Switch to the context of `phoenix-dev-cluster` with `kubectx`.
Switch to the namespace `postgres-operator` with `kubens`.

Check which pod is acting as a master
```shell
kubectl get pods -l application=spilo -L spilo-role
```

```
NAME                READY   STATUS    RESTARTS   AGE    SPILO-ROLE
phoenix-cluster-0   1/1     Running   0          3d5h   master
phoenix-cluster-1   1/1     Running   0          19h    replica
```

Check which log/day you are interested in by
```shell
kubectl exec phoenix-cluster-0 -- ls -l /home/postgres/pgdata/pgroot/pg_log
```

```shell
total 1472
-rw-r--r-- 1 postgres postgres      0 Nov  9 14:47 postgresql-0.csv
-rw-r--r-- 1 postgres postgres 225818 Mar 21 23:55 postgresql-1.csv
-rw-r--r-- 1 postgres postgres      0 Mar 21 00:00 postgresql-1.log
-rw-r--r-- 1 postgres postgres 222338 Mar 22 23:57 postgresql-2.csv
-rw-r--r-- 1 postgres postgres    214 Mar 22 17:36 postgresql-2.log
```

Copy specific log by
```shell
kubectl cp phoenix-cluster-0:/home/postgres/pgdata/pgroot/pg_log/postgresql-1.csv postgresql-1.csv
```

You can try to sort the file by highest times first with
```shell
cat postgresql-1.csv|awk '{print $6," ", $0}'|sort -rn |less
```

### Accessing virginia-dev Kamon status page

Kamon is the telemetry tool, collecting metrics from phoenix-backend and exposing it to Prometheus.

To access Kamon status page, including data on the enabled metrics, modules and reporters:

```shell
kubectl port-forward svc/phoenix-backend 5266:5266 -n phoenix
```

and go to [localhost:5266](http://localhost:5266).

### Connecting to virginia-dev Grafana

Grafana is the UI to access metrics stored in prometheus, here you can find - for example - metrics related to the state of Postgres.

Get the password for the UI (username is admin):
```shell
kubectl get secret prometheus-operator-grafana -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d | pbcopy  # or `xclip -selection clipboard` on Linux
```

Forward the access to the UI on local port 3000:
```shell
kubectl port-forward svc/prometheus-operator-grafana 3000:80 -n monitoring
```

Go to http://localhost:3000/dashboards?tag=Akka (or any other tag or lack thereof, for that matter).
Note that once in the dashboard, you might need to select a wider `Interval` to actually see meaningful data (rather than flat lines).

### Creating test accounts on virginia-dev

Accounts are enumerated in `k8s-operations/users/virginia-dev/` directory.
The shared password to all of these accounts is stored in 1password vault pointed by `passwords_*.yaml` files.

To create accounts on `virginia-dev`, execute:

```shell
eval $(op signin --account-entertainment.1password.com)  # `op` is 1password CLI - required in version 2.x
k8s-operations/sign_up_users.sh virginia-dev
```

## Outpost-stg Environment

### Accessing outpost-stg ArgoCD

Follow the [procedure for virginia-dev](#accessing-virginia-dev-argocd).

### Updating outpost-stg ArgoCD Applications

Follow the [procedure for virginia-dev](#updating-virginia-dev-argocd-applications) but for `eks-outpost-stg` directory.

ArgoCD will NOT sync the applications automatically.
Instead, you have to open a Change Request in [JIRA CR board](https://eegtech.atlassian.net/jira/servicedesk/projects/CR/) &mdash;
use [CR-157](https://eegtech.atlassian.net/browse/CR-157) as a blueprint.

### Connecting to outpost-stg database

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-database).

### Connecting to outpost-stg Keycloak

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-keycloak).

### Accessing outpost-stg Kamon status page

Follow the [procedure for virginia-dev](#accessing-virginia-dev-kamon-status-page)

### Connecting to outpost-stg Grafana

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-grafana).

### Creating test accounts on outpost-stg

Accounts are enumerated in `k8s-operations/users/outpost-stg/` directory.
Passwords to these accounts are stored in 1password vaults defined in `passwords_*.yaml` files.

To create accounts on `outpost-stg`, execute:

```shell
eval $(op signin --account-entertainment.1password.com)  # `op` is 1password CLI - required in version 2.x
k8s-operations/sign_up_users.sh outpost-stg
```


## Outpost-prd Environment

### Accessing outpost-prd ArgoCD

Follow the [procedure for virginia-dev](#accessing-virginia-dev-argocd).

### Updating outpost-prd ArgoCD Applications

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-database) but for `eks-outpost-prd` directory.

ArgoCD will NOT sync the applications automatically.
Instead, you have to open a Change Request in [JIRA CR board](https://eegtech.atlassian.net/jira/servicedesk/projects/CR/) &mdash;
use [CR-157](https://eegtech.atlassian.net/browse/CR-157) as a blueprint.

### Connecting to outpost-prd database

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-database).

### Connecting to outpost-prd Keycloak

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-keycloak).

### Accessing outpost-prd Kamon status page

Follow the [procedure for virginia-dev](#accessing-virginia-dev-kamon-status-page)

### Connecting to outpost-prd Grafana

Follow the [procedure for virginia-dev](#connecting-to-virginia-dev-grafana).

### Creating test accounts on outpost-prd

Accounts are enumerated in `k8s-operations/users/outpost-prd/` directory.
Passwords to these accounts are stored in 1password vaults defined in `passwords_*.yaml` files.

To create accounts on `outpost-prd`, execute:

```shell
eval $(op signin --account-entertainment.1password.com)  # `op` is 1password CLI - required in version 2.x
k8s-operations/sign_up_users.sh outpost-prd
```
