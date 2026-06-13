# gmx-streaming-data-sbtech-internal-model
Streaming SBTech data model into our internal keyed streams.  

## internal-model-mapping
 Module with all flink jobs. Currently we have jobs located in: net.flipsports.gmx.streaming.sbtech.job.v1.aggregated.* and net.flipsports.gmx.streaming.sbtech.job.v1.single.*
 To build:
  - sbt clean compile
  - sbt test
  - sbt sbt-streaming-engine-jobs/assembly
  
*WARNING*
SBtechFlink jobs requires environment variable:
* GMX_KAFKA_BOOTSTRAP
* GMX_KAFKA_SCHEMA_REGISTRY_URL


## main aggregated jobs: 
* net.flipsports.gmx.streaming.sbtech.job.v1.aggregated.InternalModelFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.aggregated.InternalModelRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.aggregated.InternalModelSportnationJob

## sub jobs for single topic streaming

* net.flipsports.gmx.streaming.sbtech.job.v1.single.CasinoBetFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.CasinoBetRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.CasinoBetSportsNationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.CustomerDetailsFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.CustomerDetailsRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.CustomerDetailsSportsNationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.LoginsFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.LoginsRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.LoginsSportsNationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.OfferEventsFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.OfferOptionsFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.OperatorEventsSportnationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.OperatorMarketsSportnationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.OperatorSelectionsSportnationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.SettlementDataFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.SettlementDataRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.SettlementDataSportsNationJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.WalletTransactionFansbetUkJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.WalletTransactionRedzoneJob
* net.flipsports.gmx.streaming.sbtech.job.v1.single.WalletTransactionSportsNationJob


## Flink rest api:
- upload jar to flink cluster 
````
curl -X POST -H "Expect:" -F "jarfile=@./uberjarname.jar" http://localhost:8081/jars/upload
````
- https://ci.apache.org/projects/flink/flink-docs-stable/monitoring/rest_api.html

## Build and auto deployment system on team city.