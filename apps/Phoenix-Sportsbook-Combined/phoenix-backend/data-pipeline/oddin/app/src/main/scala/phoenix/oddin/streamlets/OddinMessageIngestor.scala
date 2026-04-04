package phoenix.oddin.streamlets

import akka.actor.typed.scaladsl.adapter._
import akka.stream.scaladsl.Flow
import akka.stream.scaladsl.RunnableGraph
import akka.stream.scaladsl.Sink
import cloudflow.akkastream.AkkaStreamlet
import cloudflow.akkastream.scaladsl.RunnableGraphStreamletLogic
import cloudflow.streamlets.StreamletShape
import cloudflow.streamlets.avro.AvroOutlet

import phoenix.core.Clock
import phoenix.dataapi.internal.oddin.FixtureChangedEvent
import phoenix.dataapi.internal.oddin.MarketCancelEvent
import phoenix.dataapi.internal.oddin.MarketChangedEvent
import phoenix.dataapi.internal.oddin.MarketSettlementEvent
import phoenix.http.core.AkkaHttpClient
import phoenix.oddin.infrastructure.OddinApiConfig
import phoenix.oddin.infrastructure.OddinMessageAdapter
import phoenix.oddin.infrastructure.OddinRestApiCachedMarketDescriptionsRepository
import phoenix.oddin.infrastructure.OddinSdkConnection
import phoenix.oddin.infrastructure.OddinStreams
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi
import phoenix.utils.RandomUUIDGenerator

class OddinMessageIngestor extends AkkaStreamlet {
  import PipelineConfigParameters._

  private val marketEventsOut = AvroOutlet[MarketChangedEvent]("market-events", _.marketId)
  private val fixtureEventsOut = AvroOutlet[FixtureChangedEvent]("fixture-events", _.fixtureId)
  private val settlementEventsOut = AvroOutlet[MarketSettlementEvent]("settlement-events", _.marketId)
  private val cancelEventsOut = AvroOutlet[MarketCancelEvent]("cancel-events", _.marketId)

  override def shape() =
    StreamletShape.withOutlets(marketEventsOut, fixtureEventsOut, settlementEventsOut, cancelEventsOut)

  override def configParameters = OddinIngestorConfigurationParameters

  override def createLogic() =
    new RunnableGraphStreamletLogic() {

      override def runnableGraph(): RunnableGraph[_] = {

        val settings = oddinSettings
        val httpClient = new AkkaHttpClient(system)
        val config = settings.apiConfig

        val oddinApiConfig = OddinApiConfig(config.environment, config.url, config.accessToken, config.nodeId)
        val oddinRestApi = new AkkaHttpOddinRestApi(httpClient, oddinApiConfig)(system.toTyped)
        val marketDescriptionsRepository =
          OddinRestApiCachedMarketDescriptionsRepository(oddinRestApi, settings.marketDescriptionsCache)

        val messageListener = new OddinMessageAdapter(RandomUUIDGenerator, Clock.utcClock)(system.toTyped)

        val logSink = Flow[Any]
          .log("logSink")
          .to(Sink.foreach[Any](event =>
            log.info(s"Message transformed: [${event.getClass.getSimpleName}]: ${event.toString}")))

        OddinSdkConnection(
          settings.apiConfig.accessToken,
          settings.apiConfig.nodeId,
          settings.apiConfig.environment,
          messageListener).open()
        new OddinStreams(messageListener, oddinRestApi, marketDescriptionsRepository)(system.toTyped)
          .buildRunnableGraph(
            settings.marketFlow.eventBuilderParallelism,
            settings.fixtureFlow.eventBuilderParallelism,
            logSink,
            logSink,
            logSink,
            logSink)
      }
    }
}
