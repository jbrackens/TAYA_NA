package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event._
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class EventModule(implicit executionContext: ExecutionContext,
                  config: Config,
                  httpBackend: SttpBackend[Future, Nothing, NothingT],
                  timeService: TimeService,
                  sbtechIntegrationModule: SBTechIntegrationModule,
                  providerLookup: Set[ProviderLookup],
                  providerStreaming: Set[ProviderStreaming]) {

  lazy val eventsConfig = EventsLookupConfig.load(config)
  lazy val eventLookup = wire[EventsLookup]
  lazy val eventsStreaming = wire[EventsStreaming]

  lazy val eventsService = wire[EventsService]

  lazy val unmappedEventsConfig = UnmappedEventsCheckConfig.load(config)
  lazy val unmappedEvents = wire[UnmappedEventsCheck]
}
