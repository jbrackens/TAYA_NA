package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sis

import java.time.LocalDate

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.SISService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis.dto._

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class SISEventsCache(sisService: SISService, sisCacheConfig: SISEventsCacheConfig)
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

  override def shouldExecute(): Boolean = sisCacheConfig.providerEnabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = sisCacheConfig.interval

  override def runScheduled(): Future[Unit] = {
    logger.debug("Refresh SIS events cache")

    sisService.getAvailableEvents
      .map(processResult)
      .map(updateCache)
      .recover {
        case e: ExternalCallException =>
          logger.warn("Error while 'sisService.getSupportedEvents' - retain current list CAUSE: {}", e.getMessage)
      }
  }

  private def processResult(events: Seq[Event]): EventsMap = {
    logger.debug("Loaded SIS events: {}", events.size)
    events.groupBy(e => createGroupKey(e))
      .mapValues(_.toSet)
  }

  private def createGroupKey(event: Event): Long = {
    createGroupKey(event.startDateUtc.toLocalDate)
  }

  private def updateCache(events: EventsMap): Unit = {
    byDayEvents = events

    logger.info("After refresh SIS events cache: {}", cacheSize)
  }

  private def cacheSize = {
    byDayEvents.foldLeft(0)((acc, elem) => acc + elem._2.size)
  }
}