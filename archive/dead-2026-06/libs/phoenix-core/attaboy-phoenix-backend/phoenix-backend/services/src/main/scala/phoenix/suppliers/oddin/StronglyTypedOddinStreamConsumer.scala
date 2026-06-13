package phoenix.suppliers.oddin

import akka.actor.typed.Behavior
import akka.actor.typed.PostStop
import akka.actor.typed.scaladsl.Behaviors
import akka.actor.typed.scaladsl.adapter._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils.ScalaObjectOps
import phoenix.http.core.AkkaHttpClient
import phoenix.markets.MarketsBoundedContext
import phoenix.oddin.infrastructure.OddinConfig
import phoenix.oddin.infrastructure._
import phoenix.oddin.infrastructure.http.AkkaHttpOddinRestApi
import phoenix.suppliers.SuppliersAkkaSerializable
import phoenix.utils.RandomUUIDGenerator
object StronglyTypedOddinStreamConsumer {
  private val log = LoggerFactory.getLogger(this.objectName)

  sealed trait OddinStreamMessage extends SuppliersAkkaSerializable

  final case object Start extends OddinStreamMessage
  final case object Stop extends OddinStreamMessage

  def apply(
      settings: OddinConfig,
      clock: Clock,
      marketsContext: MarketsBoundedContext,
      useCommonDataApiModel: Boolean): Behavior[OddinStreamMessage] =
    Behaviors.setup { context =>
      import PhoenixOddinFlows._
      import settings.apiConfig._

      implicit val system = context.system
      implicit val ec = context.system.executionContext

      val akkaHttpClient = new AkkaHttpClient(system.toClassic)

      val oddinApiConfig = OddinApiConfig(environment, url, accessToken, nodeId)
      val akkaHttpOddinRestApi = new AkkaHttpOddinRestApi(akkaHttpClient, oddinApiConfig)
      val messageListener = new OddinMessageAdapter(RandomUUIDGenerator, clock)
      val marketDescriptionsRepository = OddinRestApiCachedMarketDescriptionsRepository(
        akkaHttpOddinRestApi,
        settings.marketDescriptionsCache)(system.toClassic, ec)

      val graph = if (useCommonDataApiModel) {
        log.info("Using common data api models")
        val oddinStreams =
          new CommonOddinStreams(messageListener, akkaHttpOddinRestApi, marketDescriptionsRepository)
        buildCommonOddinPipeline(oddinStreams, settings, marketsContext)
      } else {
        log.info("Using oddin data api models")
        val oddinStreams =
          new OddinStreams(messageListener, akkaHttpOddinRestApi, marketDescriptionsRepository)
        buildOddinPipeline(oddinStreams, settings, marketsContext)
      }

      graph.run()

      val oddinSdkConnection = OddinSdkConnection(accessToken, nodeId, environment, messageListener)

      receive(oddinSdkConnection)
    }

  private def receive(feed: OddinSdkConnection): Behavior[OddinStreamMessage] = {
    Behaviors
      .receiveMessage[OddinStreamMessage] {
        case Start =>
          log.info("starting")
          feed.open()
          Behaviors.same
        case Stop =>
          log.info("stopping")
          feed.close()
          Behaviors.same
      }
      .receiveSignal {
        case (_, PostStop) =>
          log.info("OddinIngestor stopped, cleanup connections")
          feed.close()
          Behaviors.same
      }
  }

}
