package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.atr.league.{ATRLeaguesCorrector, ATRSupportedLeagues}
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr.{ATREventsCache, ATREventsCacheConfig, ATRStreamingProvider}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.{ATRService, SportMediastreamClientImpl, SportMediastreamConfig}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class ATRIntegrationModule(implicit executionContext: ExecutionContext,
                           config: Config,
                           httpBackend: SttpBackend[Future, Nothing, NothingT],
                           timeService: TimeService,
                           userEncryption: UserEncryption) {

  lazy val smsAPIConfig = SportMediastreamConfig.load(config)
  lazy val smsClient = wire[SportMediastreamClientImpl]
  lazy val atrService = wire[ATRService]

  lazy val atrSupportedLeagues = new ATRSupportedLeagues
  lazy val atrLeaguesCorrector = new ATRLeaguesCorrector

  lazy val atrEventsConfig = ATREventsCacheConfig.load(config)
  lazy val atrEvents = wire[ATREventsCache]
  lazy val atrProvider = wire[ATRStreamingProvider]
}

object ATRIntegrationModule
  extends LazyLogging {

  def load(executionContext: ExecutionContext,
           config: Config,
           httpBackend: SttpBackend[Future, Nothing, NothingT],
           timeService: TimeService,
           userEncryption: UserEncryption): Option[StreamingProviderContext] = {

    val atrModule = new ATRIntegrationModule()(executionContext, config, httpBackend, timeService, userEncryption)

    if (atrModule.atrEventsConfig.providerEnabled) {
      Some(StreamingProviderContext(atrModule.atrEvents, atrModule.atrProvider, atrModule.atrProvider))
    } else {
      logger.info(s"ATR disabled - skip module")
      None
    }
  }
}
