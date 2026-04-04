# stella-data-api

Data API for Waysun events

This project contains AVRO schemas which, during the build, are automatically turned into POJO classes

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Scalafmt](#scalafmt)
    - [Scalafix](#scalafix)
- [Build Locally](#build-locally)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [sbt](https://www.scala-sbt.org/download.html)

## Git Configuration

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that a ticket number present in a branch name (
e.g. `feature/SP-101-add-avro-schema-for-system-events`) will also be automatically reflected in the commit messages (
e.g. `[SP-101] Add AVRO schema for system events`).

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/SP-101-add-avro-schema-for-system-events`. As one can see, such names contain
three parts:

- a type of work (e.g. feature, bug)
- a task number
- [optional] short information about a task

A task number should be also included in a PR title, e.g. `[SP-101] Add AVRO schema for system events`.

### Scalafmt

The code is formatted automatically during compilation in `sbt` using `scalafmt`. When using IntelliJ, select `scalafmt`
as a formatter to be used.

### Scalafix

We use Scalafix to guarantee an automated code quality standard. Including, but not limited to, organizing imports.

Before submitting a PR, Scalafix rules should be applied. To do that, run:

```shell script
sbt scalafixAll
```

## Build Locally

To build:

```shell script
sbt "+ compile"
```

To run tests:

```shell script
sbt "+ test"
```

To publish locally:

```shell script
sbt "+ publishLocal"
```

It's also possible to build the project in IntelliJ, but there are a few prerequisites needed:

1. Generate sources by compiling the project in sbt
2. In `Project Structure` settings change `Source Folders` to contain avro-related classes only once
   (e.g. keep only `compiled_avro` directory along with a standard `/src/main/scala`)
