# gmx-data-api-idefix
Data API for Idefix(Lucky Dyno) events

This project contains AVRO schemas which, during the build, are automatically turned into POJO classes

## Table of Contents

- [Requirements](#requirements)
- [Developer Tooling](#developer-tooling)
    - [Git Naming Conventions](#git-naming-conventions)
- [Build Locally](#build-locally)

## Requirements

To get setup for local development you'll need

* [Java 11 - AdoptOpenJdk 11.0.x (Hotspot)](https://adoptopenjdk.net)
* [sbt](https://www.scala-sbt.org/download.html)

## Developer Tooling

### Git Naming Conventions

The branch names should look like `feature/WAYS-101-add-avro-schema-for-system-events`. As one can see, such names contain three
parts:

- a type of work (e.g. feature, bug)
- a task number
- [optional] short information about a task

A task number should be also included in a PR title, e.g. `[GM-101] Add AVRO schema for system events`.

## Build Locally

To build:

```shell script
sbt compile
```

To run tests:

```shell script
sbt test
```

To publish locally:

```shell script
sbt publishLocal
```

It's also possible to build the project in IntelliJ, but there are a few prerequisites needed:
 1. Generate sources by compiling the project in sbt
 2. In `Project Structure` settings change `Source Folders` to contain avro-related classes only once
    (e.g. keep only `compiled_avro` directory along with a standard `/src/main/scala`)
