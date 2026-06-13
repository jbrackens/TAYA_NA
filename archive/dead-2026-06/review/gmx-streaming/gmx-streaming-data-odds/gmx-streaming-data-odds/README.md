# gmx-streaming-data-odds
Project containg all stuff related to data streaming odds based on flink. 

## gmx-streaming-data-odds-jobs
 Module with all flink jobs. Currently we have:
 - net.flipsports.gmx.streaming.sbtech.job.v1.EventsSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.MarketsSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.SelectionsSportsNationJob
 To build:
  - sbt clean compile
  - sbt test
  - sbt gmx-streaming-data-odds-jobs/assembly
  
*WARNING*
SBtechFlink jobs requires environment variable: SBTECH_KAFKA_BOOSTRAP


## Flink rest api:

Upload jar to flink cluster 
````
curl -X POST -H "Expect:" -F "jarfile=@./gmx-streaming-data-odds-jobs-0.0.1-SNAPSHOT.jar" http://localhost:8081/jars/upload
````
 https://ci.apache.org/projects/flink/flink-docs-stable/monitoring/rest_api.html

Upload all jobs in this project do:
- go to scripts
- execute: ``` sh deploy.sh ```
    

## Technology stack:
 - Apache Flink https://flink.apache.org
 - Scala
 - sbt
 - Apache Avro
 - Type Safe Config


## Build system on team city.