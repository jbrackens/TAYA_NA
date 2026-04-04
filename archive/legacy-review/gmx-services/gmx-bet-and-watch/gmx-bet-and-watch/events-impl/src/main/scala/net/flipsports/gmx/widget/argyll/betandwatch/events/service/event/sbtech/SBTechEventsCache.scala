package net.flipsports.gmx.widget.argyll.betandwatch.events.service.event.sbtech

import java.time.LocalDate

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.partner.sbtech.dict.CountryDict
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.model.PageEvent
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.SBTechService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InLeagueGame

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class SBTechEventsCache(sbtechService: SBTechService, eventsCacheConfig: SBTechEventsCacheConfig,
                        countryDict: CountryDict, timeService: TimeService)(implicit ec: ExecutionContext)
  extends ScheduledService
    with PageEventConverter
    with LazyLogging {

  type GamesMap = Map[Long, Set[InLeagueGame]]

  private var byDayEvents: GamesMap = Map()

  def getEvents(from: LocalDate, to: LocalDate): Seq[PageEvent] = {
    val fromKey = createGroupKey(from)
    val toKey = createGroupKey(to)
    byDayEvents
      .filterKeys(k => k >= fromKey && k <= toKey)
      .flatMap(_._2)
      .toSeq
      .map(toPageEvent(_)(countryDict))
  }

  private def createGroupKey(time: LocalDate): Long = {
    time.toEpochDay
  }

  override def shouldExecute(): Boolean = eventsCacheConfig.cacheEnabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = eventsCacheConfig.interval

  override def runScheduled(): Future[Unit] = {
    val currentTime = timeService.getCurrentTime
    val today = currentTime.toLocalDate
    val from = today.minusDays(eventsCacheConfig.daysBefore)
    val to = today.plusDays(eventsCacheConfig.daysAhead + 1)

    logger.debug("Refresh SBTech events cache from {} to {}", from, to)

    sbtechService
      .getAvailableEvents(to.atStartOfDay())
      .map(processResult)
      .map(updateCache(_, from))
      .recover {
        case e: ExternalCallException =>
          logger.warn(
            "Error while 'sbtechService.getAvailableEvents' - retain current list CAUSE: {}",
            e.getMessage)
      }
  }

  private def processResult(games: Seq[InLeagueGame]): GamesMap = {
    logger.debug("Loaded SBTech games: {}", games.size)
    val newEntries = games.groupBy(e => createGroupKey(e))
    val merged = byDayEvents.toSeq ++ newEntries.toSeq
    merged
      .groupBy(_._1)
      .mapValues(_.flatMap(_._2).toSet)
  }

  private def createGroupKey(event: InLeagueGame): Long = {
    createGroupKey(event.game.startTime.toLocalDate)
  }

  private def updateCache(games: GamesMap, from: LocalDate): Unit = {
    val fromKey = createGroupKey(from)
    byDayEvents = games.filterKeys(_ >= fromKey)

    logger.info("After refresh SBTech events cache: {}", cacheSize)
  }

  private def cacheSize = {
    byDayEvents.foldLeft(0)((acc, elem) => acc + elem._2.size)
  }
}
