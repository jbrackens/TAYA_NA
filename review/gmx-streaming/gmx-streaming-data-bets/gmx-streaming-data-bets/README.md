# gmx streaming data bets
Project containing all stuff related to data streaming data bets based on flink.

## common-streaming-engine
 Module with all common's for jobs.

## docker-streaming-engine
 Module containing docker compose for development and other stuff round about docker.

## sbt-streaming-engine-jobs
 Module with all flink jobs. Currently, we have:
 - net.flipsports.gmx.streaming.sbtech.job.v1.CasinoBetFansbetUkJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CasinoBetFilterFansbetUkJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CasinoBetFilterSportNationsJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CasinoBetSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CustomerDetailsFansbetUkJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CustomerDetailsRedZoneSportsJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.CustomerDetailsSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.MarketingCampaignsRewardsSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.Multibets4xRewardsSettlementDataSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.RewardsMarketSettlementDataSportsNationJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.SettlementDataFansbetUkJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.SettlementDataFilterFansbetUkJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.SettlementDataFilterSportNationsJob
 - net.flipsports.gmx.streaming.sbtech.job.v1.SettlementDataSportsNationJob
 To build:
 - sbt clean compile
 - sbt test
 - sbt customer-bets-jobs/assembly

*WARNING*
SBtechFlink jobs requires environment variable: SBTECH_KAFKA_BOOSTRAP


## Flink rest api:
- upload jar to flink cluster
````
curl -X POST -H "Expect:" -F "jarfile=@./sbt-streaming-engine-jobs-assembly-0.0.1-SNAPSHOT.jar" http://localhost:8081/jars/upload
````
- https://ci.apache.org/projects/flink/flink-docs-stable/monitoring/rest_api.html

## Technology stack:
 - Apache Flink 1.9.1 (https://flink.apache.org)
 - Scala 2.12
 - sbt 1.5.8
 - Apache Avro
 - Type Safe Config


## Build system on team city.
  - https://duna-srv01.argyll.tech:3333/project.html?projectId=GmxStreamingDataBets&branch_GmxStreamingDataBets=develop
