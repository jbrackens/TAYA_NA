# GMX User Service

The User Service ingests events relating to User activity in the system. It's Aggregate Root stores the current state of the User - current Deposit Limit, Time Out Status, etc. The Read Side Processors create reports for User activity.

## Quick Start

> Ensure you have Postgres running. (Check the [gmx-kubernetes-infrastructure](https://github.com/flipadmin/gmx-kubernetes-infrastructure/blob/master/local/README.md#starting-postgres) project.)

```shell script
sbt runAll
```

This will start in-memory Kafka and then bring up the `gmx-user-service` 

API Endpoints will be available at [http://localhost:11000](http://localhost:11000)

## Deploying to Minikube

Use the `deploy-local.sh` script in the root of this respository. This will make sure everything is setup for this service on Minikube and then build and deploy.

Check the script for exactly what it does.

## Helpers
Build with style check and test:
```shell script
sbt clean scalafmtCheck
```
Reformat code:
```shell script
sbt scalafmtAll
```
Printing dependency tree:
```
sbt dependencyBrowseTree
```