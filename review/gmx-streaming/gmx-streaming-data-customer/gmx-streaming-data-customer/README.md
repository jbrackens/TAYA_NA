# gmx-streaming-data-engine
Project containg all stuff related to data streaming engine based on flink. 

## common-streaming-engine
 Module with all common's for jobs.
 
## docker-streaming-engine
 Module containing docker compose for development and other stuff round about docker.

## sbt-streaming-engine-jobs
 Module with all flink jobs. Currently we have:
    - net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamFansbetukJob
    - net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamRedzoneJob
    - net.flipsports.gmx.streaming.internal.customers.operation.job.v1.CustomerStateChangeStreamSportnationJob
 To build:
  - sbt clean compile
  - sbt test
  - sbt customer-operations-jobs/assembly
  
*WARNING*
SBtechFlink jobs requires environment variable: SBTECH_KAFKA_BOOSTRAP


## Flink rest api:
- upload jar to flink cluster 
````
curl -X POST -H "Expect:" -F "jarfile=@./sbt-streaming-engine-jobs-assembly-0.0.1-SNAPSHOT.jar" http://localhost:8081/jars/upload
````
- https://ci.apache.org/projects/flink/flink-docs-stable/monitoring/rest_api.html

## Technology stack:
 - Apache Flink https://flink.apache.org
 - Scala
 - sbt
 - Apache Avro
 - Type Safe Config


## Build system on team city.

## Deployment
 ./deployment/flink-deployment/download.sh 0.0.1 dev.properties
 ./deployment/flink-deployment/stop.sh 0.0.1 dev.properties
 ./deployment/flink-deployment/undeploy.sh 0.0.1 dev.properties
 ./deployment/flink-deployment/upload.sh 0.0.1 dev.properties
 ./deployment/flink-deployment/start.sh 0.0.1 dev.properties