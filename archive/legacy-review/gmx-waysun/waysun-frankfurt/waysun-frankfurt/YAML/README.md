# K8S deployment instructions

This file will describe all actions required to do on Tencent TKE (K8S) service to deploy **STELLA** project.

## Structure

Folder contains a list of directories, name based ordering, which inside you can find a script called `setup.sh`, 
which as first parameters accepts environment type. Possible values are:

 * `develop` - for development environment
 * `preprod` - for preprod environment
 * `production` - for production environment

## Requirements

This script requires:

 * `BitWarden CLI` - to read secrets from BitWarden
 * `envsubst` - part of `gettext` package to create correct YAMLS.

### BitWarden configuration

Script is using a **BitWarden** CLI API key method so during an execution you need to set those env variables:


| Environment Variable Name | Required Value                 |
|---------------------------|--------------------------------|
| `BW_CLIENTID `            | client_id                      |
| `BW_CLIENTSECRET`         | client_secret                  |
| `BW_PASSWORD`             | Password used to decode Vault  |

### BitWarden - keys

This semantic where used to create keys for resources:

  `<SERVICE_TYPE>:<CLOUND_PROVIDER>:<ENVIRONMENT_NAME>:::<RESOURCE_NAME>:<AVAILABILITY_ZONE>:<REGION>`

This semantic where used to create keys for environment variables:

  `env_var:stella:<ENVIRONMENT_NAME>:::<CONTEXT_NAME>:<RESOURCE_NAME>:<OPTIONAL_NOTES>`

So for example key: `redis:tencent:manual-dev:::manual-redis:frankfurt-1,frankfurt` stands for:


| Variable Name       | Variable Value |
|---------------------|----------------|
| `SERVICE_TYPE `     | `redis`        |
| `CLOUND_PROVIDER`   | `tencent`      |
| `ENVIRONMENT_NAME`  | `manual-dev`   |
| `RESOURCE_NAME`     | `manual-redis` |
| `AVAILABILITY_ZONE` | `frankfurt-1`  |
| `REGION`            | `frankfurt`    |

So for example key: `env_var:stella:manual-dev:::microservices:common` stands for:


| Variable Name       | Variable Value  |
|---------------------|-----------------|
| `ENVIRONMENT_NAME ` | `manual-dev`    |
| `CONTEXT_NAME`      | `microservices` |
| `RESOURCE_NAME`     | `common`        |
| `OPTIONAL_NOTES`    | ``              |


## Parameters rules

 1. Order of loading parameters:
    1. `default.env`
    2. `<environment_type>.env`
 2. Every parameter **MUST** be prefixed with `CFG_`
 3. Every environment variable can be forced overwritten by prefixing it by `FORCE_CFG_`
 4. When you place `readonly` **before** name of the parameter, it will be marked as readonly and can not be modified later.
 5. When you want to use a parameter and read its value from SecureStorage use format described on [How to use SecureStorage](#securestorage)


## How to use SecureStorage {#securestorage}

When you want to use parameter which value should be loaded from external system such as 1Password or Bitwarden you can use this semantics:

> `<PROVIDER_TYPE>|<pipe separated parameters>`

### Supported providers:

#### BitWarden

__Provider type__: `bitwarden`
__Parameters__:
* `secret name`
* `field name`

##### Example:
`bitwarden|redis:tencent:manual-dev:::manual-redis:frankfurt-1,frankfurt|database_name`

This value will be read from BitWarden from `redis:tencent:manual-dev:::manual-redis:frankfurt-1,frankfurt` item, from `database_name` field.



#### RAW

__Provider type__: `raw`
__Parameters__:
* `secret value`

##### Example:
`raw|sample_value`

This value will not use any provider and `example_value` will be returned.

## Template rules

1. All variables used in script are available inside `.ytpl` files during compilation
2. Compilation is being made by `envsubst`
3. If you want to protect some variable against replacement (for example during special shell command in init containers) instead writing `${SOME_VAR}` please use `§{SOME_VAR}`
  This will cause bypassing `envsubst` replacement and on next step, the command `sed 's/§/$/g'` replaces all `§` back to `$`


## Services

When you want to add specified service into Ingress please these annotations, so they will be included:

```yaml
    eeg-ingress/enabled: "true"
    eeg-ingress/path: "/SOME_PATH"
    eeg-ingress/service-name: "SERVICE NAME FROM TOP"
    eeg-ingress/service-port: "PORT OF THIS SERVICE"
```
Example:

```yaml
    eeg-ingress/enabled: "true"
    eeg-ingress/path: "/event_ingestor"
    eeg-ingress/service-name: "event-ingestor"
    eeg-ingress/service-port: "8080"
```