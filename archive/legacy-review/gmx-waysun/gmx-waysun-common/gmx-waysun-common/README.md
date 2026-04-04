# stella-common

## Table of Contents

- [Requirements](#requirements)
- [Git Configuration](#git-configuration)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
    - [Scalafmt](#scalafmt)
    - [Scalafix](#scalafix)
- [Build & Run Locally](#build--run-locally)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [sbt](https://www.scala-sbt.org/download.html)

## Git Configuration

After cloning the repository, set up the `prepare-commit-msg` git hook:

```shell script
ln -s ../../dev/prepare-commit-msg .git/hooks/prepare-commit-msg
```

This will make sure that a ticket number present in a branch name (e.g. `feature/SP-399-extract-commons-from-event-ingestor`) will also
be automatically reflected in the commit messages (e.g. `[SP-399] Create project configuration and move commons from Event Ingestor`).

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/SP-399-extract-commons-from-event-ingestor`. As one can see, such names contain three
parts:

- a type of work (e.g. feature, bug)
- a task number
- short information about a task

A task number should be also included in a PR title, e.g. `[SP-399] Create project configuration and move commons from Event Ingestor`.

### Scalafmt

The code is formatted automatically during compilation in `sbt` using `scalafmt`. When using IntelliJ, select `scalafmt`
as a formatter to be used.

### Scalafix

We use Scalafix to guarantee an automated code quality standard. Including, but not limited to, organizing imports.

Before submitting a PR, Scalafix rules should be applied. To do that, run:

```shell script
sbt scalafixAll
```

## Build & Run Locally

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
