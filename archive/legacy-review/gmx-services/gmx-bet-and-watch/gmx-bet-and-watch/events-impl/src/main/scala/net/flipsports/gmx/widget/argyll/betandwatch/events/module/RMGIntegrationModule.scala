package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.rmg.league.{RMGLeaguesCorrector, RMGSupportedLeagues}
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.rmg.{RMGEventsCache, RMGEventsCacheConfig, RMGStreamingProvider}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.{ContentScoreboardClientImpl, ContentScoreboardConfig, RMGService}
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class RMGIntegrationModule(implicit executionContext: ExecutionContext,
                           config: Config,
                           httpBackend: SttpBackend[Future, Nothing, NothingT],
                           timeService: TimeService,
                           userEncryption: UserEncryption) {

  lazy val streamDesktopAPIClient = new ContentScoreboardClientImpl(
    ContentScoreboardConfig(config),
    userEncryption
  )
  lazy val streamMobileAPIClient = new ContentScoreboardClientImpl(
    ContentScoreboardConfig(config, "app.external.rmg.csb-mobile"),
    userEncryption
  )
  lazy val rmgService = new RMGService(streamDesktopAPIClient, streamMobileAPIClient)

  lazy val rmgSupportedLeagues = new RMGSupportedLeagues
  lazy val rmgLeaguesCorrector = new RMGLeaguesCorrector

  lazy val rmgEventsConfig = RMGEventsCacheConfig(config)
  lazy val rmgEvents = wire[RMGEventsCache]
  lazy val rmgProvider = wire[RMGStreamingProvider]
}

object RMGIntegrationModule
  extends LazyLogging {

  def load(executionContext: ExecutionContext,
           config: Config,
           httpBackend: SttpBackend[Future, Nothing, NothingT],
           timeService: TimeService,
           userEncryption: UserEncryption): Option[StreamingProviderContext] = {

    val rmgModule = new RMGIntegrationModule()(executionContext, config, httpBackend, timeService, userEncryption)

    if (rmgModule.rmgEventsConfig.enabled) {
      Some(StreamingProviderContext(rmgModule.rmgEvents, rmgModule.rmgProvider, rmgModule.rmgProvider))
    } else {
      logger.info(s"RMG disabled - skip module")
      None
    }
  }
}

