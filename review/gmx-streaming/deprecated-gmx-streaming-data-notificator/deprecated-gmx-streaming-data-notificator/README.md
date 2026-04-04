# gmx-streaming-data-notificator
Project containg all stuff related to data streaming engine based on flink. 

## notifications-jobs
 Module with all flink jobs. Currently we have:
 - net.flipsports.gmx.streaming.internal.notifications.job.v1.IrishCustomerRegistrationNotificationSportnationJob
 To build:
  - sbt clean compile
  - sbt test
  - sbt notification-jobs/assembly

*WARNING* !
Flink jobs requires environment variable: GMX_KAFKA_BOOTSTRAP


## Flink rest api:
- upload jar to flink cluster
````
curl -X POST -H "Expect:" -F "jarfile=@./notification-jobs-0.0.1-SNAPSHOT.jar" http://localhost:8081/jars/upload
````
- https://ci.apache.org/projects/flink/flink-docs-stable/monitoring/rest_api.html

## Technology stack:
 - Apache Flink https://flink.apache.org
 - Scala
 - sbt
 - Apache Avro
 - Type Safe Config


## Build system on team city.