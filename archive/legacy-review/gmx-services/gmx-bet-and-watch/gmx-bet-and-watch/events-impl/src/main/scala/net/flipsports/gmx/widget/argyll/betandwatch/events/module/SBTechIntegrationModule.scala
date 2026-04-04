package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import java.util
import java.util.function.Supplier

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.partner.sbtech.dict.{CountryDict, CountryDictEntry}
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech.{CountriesSupplier, SBTechEventsCache, SBTechEventsCacheConfig}
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech._
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class SBTechIntegrationModule(implicit executionContext: ExecutionContext,
                              config: Config,
                              httpBackend: SttpBackend[Future, Nothing, NothingT],
                              timeService: TimeService) {

  lazy val oddsAPIConfig = OddsAPIConfig.load(config)
  lazy val dataAPIConfig = DataAPIConfig.load(config)
  lazy val oddsAPIClient = wire[OddsAPIClientImpl]
  lazy val dataAPIClient = wire[DataAPIClientImpl]
  lazy val sbtechService = wire[SBTechService]

  lazy val countriesSupplier: Supplier[util.List[CountryDictEntry]] = wire[CountriesSupplier]
  lazy val countryDict = new CountryDict(countriesSupplier)

  lazy val sbtechEventsConfig = SBTechEventsCacheConfig.load(config)
  lazy val sbtechEvents = wire[SBTechEventsCache]
}
