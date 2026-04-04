package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import java.time.temporal.ChronoUnit
import java.time.{LocalDate, LocalDateTime}

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.SBTechService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto.InBetSelection

import scala.concurrent.duration.FiniteDuration
import scala.concurrent.{ExecutionContext, Future}

class SBTechBetsCache(sbtechService: SBTechService,
                      betsCacheConfig: SBTechBetsCacheConfig,
                      timeService: TimeService)(implicit ec: ExecutionContext)
  extends ScheduledService
    with LazyLogging {

  type BetsMap = Map[Long, Seq[InBetSelection]]

  private var byDayBets: BetsMap = Map()
  private var lastSegment: LocalDateTime = currentCacheStart().atStartOfDay()

  private def currentCacheStart(): LocalDate = {
    val currentTime = timeService.getCurrentTime
    currentTime.toLocalDate
      .minusDays(betsCacheConfig.daysBefore)
  }

  def getBets: Seq[InBetSelection] = {
    byDayBets
      .toSeq
      .sortBy(_._1)
      .flatMap(_._2)
  }

  override def shouldExecute(): Boolean = betsCacheConfig.cacheEnabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = betsCacheConfig.interval

  override def runScheduled(): Future[Unit] = {
    implicit val currentTime: LocalDateTime = timeService.getCurrentTime
    val from = lastSegment.minus(betsCacheConfig.segmentOverlap.toMillis, ChronoUnit.MILLIS)
    val to = from.plus(betsCacheConfig.segmentSize.toMillis, ChronoUnit.MILLIS)

    logger.debug("Refresh bets cache from {} to {}", from, to)

    sbtechService
      .getUserHorseRacingBets(from, to)
      .map(processResult)
      .map(updateCache(_, to))
      .recover {
        case e: ExternalCallException =>
          logger.warn("Error while 'sbtechService.getUserHorseRacingBets' - retain current list CAUSE: {}", e.getMessage)
      }
  }

  private def processResult(games: Seq[InBetSelection]): BetsMap = {
    logger.debug("Loaded SBTech bets: {}", games.size)
    val newEntries = games.groupBy(e => createGroupKey(e))
    val merged = byDayBets.toSeq ++ newEntries.toSeq
    merged
      .groupBy(_._1)
      .mapValues(_.flatMap(_._2).distinct)
  }

  private def updateCache(games: BetsMap, to: LocalDateTime): Unit = {
    val currentTime = timeService.getCurrentTime
    val fromKey = createGroupKey(currentCacheStart())
    byDayBets = games.filterKeys(_ >= fromKey)

    if (to.isBefore(currentTime)) {
      lastSegment = to
    } else {
      lastSegment = currentTime
    }

    logger.info("After refresh bets cache: {}", cacheSize)
  }

  private def cacheSize = {
    byDayBets.foldLeft(0)((acc, elem) => acc + elem._2.size)
  }

  private def createGroupKey(event: InBetSelection): Long = {
    createGroupKey(event.selection.eventDate.toLocalDate)
  }

  private def createGroupKey(time: LocalDate): Long = {
    time.toEpochDay
  }
}
