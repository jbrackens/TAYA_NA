package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.atr

import java.time.LocalDate

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.ATRService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.Event

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class ATREventsCache(atrService: ATRService, atrCacheConfig: ATREventsCacheConfig, timeService: TimeService)
                    (implicit ec: ExecutionContext)
  extends ScheduledService
    with LazyLogging {

  type EventsMap = Map[Long, Set[Event]]

  private var byDayEvents: EventsMap = Map()

  def getEvents(from: LocalDate, to: LocalDate): Seq[Event] = {
    getEvents(from, to, e => !e.isTest)
  }

  private def getEvents(from: LocalDate, to: LocalDate, eventFilter: Event => Boolean) = {
    val fromKey = createGroupKey(from)
    val toKey = createGroupKey(to)
    byDayEvents
      .filterKeys(k => k >= fromKey && k <= toKey)
      .flatMap(_._2.filter(eventFilter))
      .toSeq
  }

  private def createGroupKey(time: LocalDate): Long = {
    time.toEpochDay
  }

  def getTestEvents(from: LocalDate, to: LocalDate): Seq[Event] = {
    getEvents(from, to, e => e.isTest)
  }

  override def shouldExecute(): Boolean = atrCacheConfig.providerEnabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = atrCacheConfig.interval

  override def runScheduled(): Future[Unit] = {
    val currentTime = timeService.getCurrentTime
    val today = currentTime.toLocalDate
    val from = today.minusDays(atrCacheConfig.daysBefore)
    val to = today.plusDays(atrCacheConfig.daysAhead + 1)

    logger.debug("Refresh ATR events cache from {} to {}", from, to)

    atrService.getAvailableEvents(from.atStartOfDay(), to.atStartOfDay())
      .map(processResult)
      .map(updateCache)
      .recover {
        case e: ExternalCallException =>
          logger.warn("Error while 'atrService.getSupportedEvents' - retain current list CAUSE: {}", e.getMessage)
      }
  }

  private def processResult(events: Seq[Event]): EventsMap = {
    logger.debug("Loaded ATR events: {}", events.size)
    events.groupBy(e => createGroupKey(e))
      .mapValues(_.toSet)
  }

  private def createGroupKey(event: Event): Long = {
    createGroupKey(event.startTime.toLocalDate)
  }

  private def updateCache(events: EventsMap): Unit = {
    byDayEvents = events

    logger.info("After refresh ATR events cache: {}", cacheSize)
  }

  private def cacheSize = {
    byDayEvents.foldLeft(0)((acc, elem) => acc + elem._2.size)
  }
}