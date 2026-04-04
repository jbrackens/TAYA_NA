package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet.{BetsConfig, BetsService, SBTechBetsCache, SBTechBetsCacheConfig}
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}


@Module
class BetModule(implicit executionContext: ExecutionContext,
                config: Config,
                httpBackend: SttpBackend[Future, Nothing, NothingT],
                timeService: TimeService,
                sbtechIntegrationModule: SBTechIntegrationModule) {

  lazy val sbtechBetsConfig = SBTechBetsCacheConfig.load(config)
  lazy val betsConfig = BetsConfig.load(config)
  lazy val sbtechBets = wire[SBTechBetsCache]
  lazy val betsService = wire[BetsService]
}
