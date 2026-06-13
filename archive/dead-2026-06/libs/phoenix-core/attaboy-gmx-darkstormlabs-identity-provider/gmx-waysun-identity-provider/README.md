# stella-identity-provider

Identity and Access Management provider

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Spotless](#spotless)
- [Run Tests Locally](#run-tests-locally)
- [Set Up Before Running The Server Locally](#set-up-before-running-the-server-locally)
    - [Set up fake IP and local stella.local domain](#set-up-fake-ip-and-local-stellalocal-domain)
    - [Start gmx-traefik](#start-gmx-traefik)
- [Run Identity Provider Locally](#run-identity-provider-locally)
- [Keycloak Configuration](#keycloak-configuration)
    - [Docker variables](#docker-variables)
    - [Create client](#create-client)
    - [Create user](#create-user)
    - [Create project and associate client with it](#create-project-and-associate-client-with-it)
    - [Fetch JWT](#fetch-jwt)
    - [Sign a payload](#sign-a-payload)
    - [Event listener](#event-listener)
    - [Configure login via Facebook and Google](#configure-login-via-facebook-and-google)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [maven](https://maven.apache.org/download.cgi)
* [Docker Compose](https://docs.docker.com/compose/install/)

## Git Configuration

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that a ticket number present in a branch name (
e.g. `feature/STLD-492-wrap-custom-endpoints-responses`) will also be automatically reflected in the commit messages (
e.g. `[STLD-492] Wrap successful reponses from custom endpoints in our standard json envelope`).

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/STLD-492-wrap-custom-endpoints-responses`. As one can see, such names contain
three parts:

- a type of work (e.g. feature, bug)
- a task number
- [optional] short information about a task

A task number should be also included in a PR title,
e.g. `[STLD-492] Wrap successful reponses from custom endpoints in our standard json envelope`.

### Spotless

We use `spotless` to format code and organise imports according to the predefined rules. Before submitting a
PR, `spotless` rules should be applied. To do that, run:

```shell
mvn spotless:apply
```

It also should be possible to use the rules in IntelliJ when
using [Eclipse Code Formatter plugin](https://plugins.jetbrains.com/plugin/6546-eclipse-code-formatter) with path to
`/config/spotless/formatting-rules.xml` specified as a config file in the plugin's settings.

## Run Tests Locally

Integration test files should end with `IT` prefix. These kinds of tests require keycloak server.
`integration-test` maven build phase uses docker image created by dockerfile-maven-plugin to run keycloak server.

```shell
mvn integration-test
```

`mvn test` omits integration tests.

## Set Up Before Running The Server Locally

* This project depends on [gmx-traefik](https://github.com/flipadmin/gmx-traefik) which is used to start a basic
  infrastructure and configure reverse proxy

### Set up fake IP and local stella.local domain

1. Create docker network

   ```shell
   docker network create gmx-internal
   ```

2. Add entry to `/etc/hosts`

   ```shell
   sudo echo "192.168.99.1    stella.local" >> /etc/hosts
   ```

3. Create a `loopback` device alias (it may be needed to repeat this after every reboot)

   **darwin:**

   ```shell
   sudo ifconfig lo0 alias 192.168.99.1 255.255.255.0
   ```

   **linux:**

   ```shell
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

## Run Identity Provider Locally

Run [gmx-traefik](#start-gmx-traefik), ensure that DB_DATABASE in docker/local.env file points to an existing database (
it won't be created automatically), ensure DB_USER and DB_PASSWORD are the correct, real credentials. You can
use [pgadmin](http://stella.local:8000/pgadmin/) to create a Postgres user or/and a database.

Build project:

```shell
mvn clean package
```

And run:

```shell
docker-compose -f docker/docker-compose.yml up
```

## Keycloak Configuration

Once the docker container is started, one can create clients, configure our custom mappers for them, add users, add
projects and associate clients with projects.

### Docker variables

How to initially set up a keycloak in docker container please refer
to [Keycloak Server Docker image](https://hub.docker.com/r/jboss/keycloak). Most important env variables are:

| Env variable | Description |
|---|---|
`KC_DB` | Keycloak image supports using H2, MySQL, PostgreSQL, MariaDB, Oracle or Microsoft SQL Server as the database. `stella-identity-provider` needs `postgres`
`KC_DB_URL` | connection url to connect to PostgreSQL
`KC_DB_USERNAME`| user to use to authenticate to the database
`KC_DB_PASSWORD`| user's password to use to authenticate to the database
`KEYCLOAK_ADMIN`| initial admin account username
`KEYCLOAK_ADMIN_PASSWORD`| initial admin account password
`ALLOW_ACCESS_TOKEN_AUTHORIZATION`| if this variable is `true` access token is also a valid token
`IDENTITY_PROVIDER_EVENT_INGESTOR_BASE_URL` | event ingestor url prefix
`IDENTITY_PROVIDER_EVENT_INGESTOR_ADMIN_ENDPOINT_PATH` | event ingestor admin endpoint path suffix
`IDENTITY_PROVIDER_PUBLISHER_USERNAME` | publisher username (it has to be a user with `event_ingestor:admin:any:event:write` permission)
`IDENTITY_PROVIDER_PUBLISHER_REALM` | publisher realm
`IDENTITY_PROVIDER_PUBLISHER_CLIENT_ID` | publisher client_id
`IDENTITY_PROVIDER_PUBLISHER_TOKEN_MINIMUM_REMAINING_SECONDS_TO_EXPIRE` | how many seconds before publisher token expiration, token should be recreated

### Create client

1. Open [Keycloak GUI](http://stella.local:8000/auth/). Default credentials are `admin` and `password`.
1. In `Clients` section use `Create` button. Choose a name and accept.
1. In `Clients` section edit a newly added client.
1. `Settings` tab should be selected.
1. Change `Access Type` to `confidential`.

To use our custom mappers, one needs to add them to the client (before making it, check that the
[first project is created](#create-project-and-associate-client-with-it) using user's `access_token` with required
permission)

1. When editing a client, open `Mappers` tab.
1. Use `Create` button
1. Add and configure ``Stella `Extra` Field Provider``, `Stella Role Claims Remover`.

### Create user

1. Open [Keycloak GUI](http://stella.local:8000/auth/).
1. In `Users` section use `Add user` button. Choose a username, check email as verified and accept.
1. In `Users` section edit a newly added user.
1. Open `Credentials` tab.
1. Add and confirm password. Ensure it's NOT marked as `temporary`.

### Create project and associate client with it

Following endpoints need valid [`id_token`](#fetch-jwt). On totally fresh keycloak instance user's `access_token` has to
be used to create a first project and associate client to it. To be able to use `access_token` for mentioned
endpoints `ALLOW_ACCESS_TOKEN_AUTHORIZATION` env variable has to be set to `true`.

To create a project, it's needed to send a request like:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/projects --header "Content-Type: application/json" --request POST --data '{"name":"<project_name>","description":"description", "kid":"<exisiting key id>"}' --header "Authorization: Bearer <ID-TOKEN>"
```

To update a project information, it's needed to send a request like:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/projects/<project_public_id> --header "Content-Type: application/json" --request PUT --data '{"name":"<project_name>","description":"description", "kid":"<exisiting key id>"}' --header "Authorization: Bearer <ID-TOKEN>"
```

To associate clients with such project, it's needed to call:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/clients/<client_id>/projects --header "Content-Type: application/json" --request PUT --data '{"primary_project":"<primary_project_public_id>","additional_projects":["additional_project_public_id_1", "additional_project_public_id_2"]}' --header "Authorization: Bearer <ID-TOKEN>"
```

Required permission for above endpoints is `oidc:admin:project:write`.

You can also pass your `correlationId` via `X-Api-Message-Id` header. Our additional, custom endpoints are configured to
use this value in logs.

It's possible to fetch a single project with it's associated companies using:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/projects/<project_public_id> --request GET --header "Authorization: Bearer <ID-TOKEN>"
```

There exists a similar endpoint to fetch all projects within a given realm:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/projects --request GET --header "Authorization: Bearer <ID-TOKEN>"

```

Both endpoints require `oidc:admin:project:read` or `oidc:superadmin:project:read` permission.

`oidc:superadmin:project:read` role has a special meaning when calling an endpoint using `master` realm. In that
case the endpoint to fetch a single project returns **any** project in the system regardless a realm it belongs to.
Similarly, in a case of the endpoint returning the list of the projects, calling this endpoint in `master` realm as
super admin allows to get a list of all projects within the system regardless of the realm they belong to.

### Fetch JWT

To fetch tokens for a user, send a following request:

```
curl http://stella.local:8000/auth/realms/<realm_name>/protocol/openid-connect/token -d "client_id=<client_name>" -d "client_secret=<secret_value_from_client_configuration_in_gui>" -d "username=<user_name>" -d "password=<user_password>" -d "grant_type=password" -d "scope=openid"
```

You can find `secret_value_from_client_configuration_in_gui` in `Credentials` tab when editing a client
in [Keycloak GUI](http://stella.local:8000/auth/). It's a `Secret` value with `Regenerate Secret` button next to it.

You can check the content of the returned tokens using [https://jwt.io](https://jwt.io)

When using our mappers, `realm_access` and `resource_access` in Access Token should be hidden (literally replaced with
value_hidden)

### Sign a payload

To sign a payload using a key associated with the project, send a following request:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/admin/sign -XPOST -d '{"payload":"payload_to_sign"}' -H "Authorization: Bearer <ID-TOKEN>"
```

when `ID-TOKEN` is an identity token for the user associated with a given project.
`oidc:admin:sign` permission is required, project needs to have configured key.

To sign a payload on behalf of other project (using a key associated with this project), send a following request:

```
curl http://stella.local:8000/auth/realms/<realm_name>/stella/admin/sign/for/<project_public_id> -XPOST -d '{"payload":"payload_to_sign"}' -H "Authorization: Bearer <ID-TOKEN>"
```

`oidc:admin:any:sign` permission is required, project needs to have configured key.

### Event listener

Go to `Events` page, choose `Config` tab and add `stella-event-listener` in the `Event Listeners` field.
`IDENTITY_PROVIDER_PUBLISHER_USERNAME` needs to be configured (and publisher user created)
before `stella-event-listener` enabling.

The `UserLoggedIn` event will be published to the `event ingestor` service. To have the whole flow working,
one needs to create such the event configurations using the `rule configurator` service:

```
{
  "name": "internal.identityProvider.UserLoggedIn",
  "description": "Sent by Identity Provider",
  "fields": [
    {
      "name": "clientId",
      "valueType": "String"
    },
    {
      "name": "details.authMethod",
      "valueType": "String"
    },
    {
      "name": "details.grantType",
      "valueType": "String"
    },
    {
      "name": "details.refreshTokenType",
      "valueType": "String"
    },
    {
      "name": "details.scope",
      "valueType": "String"
    },
    {
      "name": "details.clientAuthMethod"",
      "valueType": "String"
    }
  ]
}
```

### Configure login via Facebook and Google

The details can be found [here](docs/social-login.md)
