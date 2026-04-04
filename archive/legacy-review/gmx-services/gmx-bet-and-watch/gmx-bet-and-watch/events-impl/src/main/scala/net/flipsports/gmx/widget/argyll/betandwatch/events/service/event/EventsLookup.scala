package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event

import java.time.{LocalDate, LocalDateTime}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.model._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech.SBTechEventsCache

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

class EventsLookup(sbtechEvents: SBTechEventsCache, providerLookup: Set[ProviderLookup],
                   eventsConfig: EventsLookupConfig, timeService: TimeService)
  extends ScheduledService
    with LazyLogging {

  private val providerMap: Map[String, ProviderLookup] = providerLookup
    .map(p => p.provider.toString.toLowerCase() -> p)(collection.breakOut)

  var id2Event: Map[Long, EventMapping] = Map()

  override def shouldExecute(): Boolean = eventsConfig.enabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = eventsConfig.interval

  override def runScheduled(): Future[Unit] = {
    val currentTime = timeService.getCurrentTime
    val today = currentTime.toLocalDate
    val from = today.minusDays(eventsConfig.daysBefore)
    val to = today.plusDays(eventsConfig.daysAhead)

    logger.debug("Refresh events mapping")
    providerLookup.foreach(_.reload(from, to))

    val supportedEvents = loadGames(from, to)
    val testEvents = loadTestEvents(from, to)

    updateCache((supportedEvents ++ testEvents)
      .map(mapping => mapping.event.id -> mapping)(collection.breakOut))

    Future.unit
  }

  private def loadGames(from: LocalDate, to: LocalDate): Seq[EventMapping] = {
    val pageEvents = sbtechEvents.getEvents(from, to)
    logger.debug("SBTech games from cache: {}", pageEvents.size)

    pageEvents
      .map(event => EventWithProvider(event, findCorrespondingProvider(event)))
      .filter(_.hasProvider)
      .map(em => {
        val foundProvider = em.provider.get
        val mappedEvent = foundProvider.getMapping(em.game)
        val streamingModel = mappedEvent.map(_.streamingModel)
          .getOrElse(foundProvider.streamingModel(em.game))
        EventMapping(em.game, foundProvider.provider, streamingModel, mappedEvent)
      })
  }

  private def findCorrespondingProvider(event: PageEvent): Option[ProviderLookup] = {
    providerLookup.find(_.isSupported(event))
  }

  private def findProvider(provider: String): Option[ProviderLookup] = {
    providerMap.get(provider.toLowerCase)
  }

  private def loadTestEvents(from: LocalDate, to: LocalDate): Seq[EventMapping] = {
    if (!eventsConfig.includeTestData) {
      logger.debug("TEST events - DISABLED")
      return Seq()
    }

    providerLookup.toSeq.flatMap(availableProvider => {
      availableProvider.loadTestEvents(from, to)
        .map(e => EventMapping(fabricateTestEvent(e), availableProvider.provider, e.streamingModel, Some(e)))
    })
  }

  private def updateCache(mapping: Map[Long, EventMapping]): Unit = {
    id2Event = mapping

    logger.info("After refresh events mapping: {}", id2Event.size)
  }

  def getEvent(sbtechId: Long): Option[EventMapping] = {
    id2Event.get(sbtechId)
  }

  def getFullDay(provider: String): Option[EventMapping] = {
    implicit val currentTime: LocalDateTime = timeService.getCurrentTime

    findProvider(provider)
        .flatMap(foundProvider => {
          foundProvider.loadFullDay(currentTime)
            .map(e => EventMapping(fabricateFullDayEvent(e), foundProvider.provider, e.streamingModel, Some(e)))
        })
  }

  def getMapping: Future[Seq[EventMapping]] = {
    Future.successful(id2Event.values.toSeq
      .sortBy(em => (em.provider, em.event.league, em.event.startTime.toEpochSecond)))
  }

  private case class EventWithProvider(game: PageEvent, provider: Option[ProviderLookup]) {
    def hasProvider: Boolean = provider.isDefined
  }
}
