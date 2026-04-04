package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.rmg

import java.time.LocalDate

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.RMGService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg.dto._

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class RMGEventsCache(rmgService: RMGService, rmgCacheConfig: RMGEventsCacheConfig)
                    (implicit ec: ExecutionContext)
  extends ScheduledService
    with LazyLogging {

  type EventsMap = Map[Long, Set[Event]]

  private var byDayEvents: EventsMap = Map()

  def getEvents(from: LocalDate, to: LocalDate): Seq[Event] = {
    getEvents(from, to, _ => true)
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

  override def shouldExecute(): Boolean = rmgCacheConfig.enabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = rmgCacheConfig.interval

  override def runScheduled(): Future[Unit] = {
    logger.debug("Refresh RMG events cache")

    rmgService.getAvailableEvents
      .map(processResult)
      .map(updateCache)
      .recover {
        case e: ExternalCallException =>
          logger.warn("Error while 'rmgService.getSupportedEvents' - retain current list CAUSE: {}", e.getMessage)
      }
  }

  private def processResult(events: Seq[Event]): EventsMap = {
    logger.debug("Loaded RMG events: {}", events.size)
    events.groupBy(e => createGroupKey(e))
      .mapValues(_.toSet)
  }

  private def createGroupKey(event: Event): Long = {
    createGroupKey(event.startTime.toLocalDate)
  }

  private def updateCache(events: EventsMap): Unit = {
    byDayEvents = events

    logger.info("After refresh RMG events cache: {}", cacheSize)
  }

  private def cacheSize = {
    byDayEvents.foldLeft(0)((acc, elem) => acc + elem._2.size)
  }
}