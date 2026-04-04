package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.sis.league.SISSupportedLeagues
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis.{SISEventsCache, SISEventsCacheConfig, SISStreamingProvider}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.{SISService, SISStreamClientImpl, StreamAPIConfig}
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class SISIntegrationModule(implicit executionContext: ExecutionContext,
                           config: Config,
                           httpBackend: SttpBackend[Future, Nothing, NothingT],
                           timeService: TimeService,
                           userEncryption: UserEncryption) {

  lazy val streamAPIConfig = StreamAPIConfig(config)
  lazy val streamAPIClient = wire[SISStreamClientImpl]
  lazy val sisService = wire[SISService]

  lazy val sisSupportedLeagues = new SISSupportedLeagues

  lazy val sisEventsConfig = SISEventsCacheConfig.load(config)
  lazy val sisEvents = wire[SISEventsCache]
  lazy val sisProvider = wire[SISStreamingProvider]
}

object SISIntegrationModule
  extends LazyLogging {

  def load(executionContext: ExecutionContext,
           config: Config,
           httpBackend: SttpBackend[Future, Nothing, NothingT],
           timeService: TimeService,
           userEncryption: UserEncryption): Option[StreamingProviderContext] = {

    val sisModule = new SISIntegrationModule()(executionContext, config, httpBackend, timeService, userEncryption)

    if (sisModule.sisEventsConfig.providerEnabled) {
      Some(StreamingProviderContext(sisModule.sisEvents, sisModule.sisProvider, sisModule.sisProvider))
    } else {
      logger.info(s"SIS disabled - skip module")
      None
    }
  }
}