package net.flipsports.gmx.widget.argyll.betandwatch.events.service.bet

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech.dto._

import scala.concurrent.Future
import scala.concurrent.duration.FiniteDuration

class BetsService(sbtechBets: SBTechBetsCache,
                  betsConfig: BetsConfig)
  extends ScheduledService
    with LazyLogging {

  private var userEventBets: Map[Long, Map[Long, Seq[InBetSelection]]] = Map()

  def loadUserBetsForEvent(userDetails: UserDetails, eventId: Long): Future[Seq[InBetSelection]] = Future.successful(
    userEventBets.get(userDetails.id)
      .flatMap(_.get(eventId))
      .getOrElse(Seq())
  )

  override def shouldExecute(): Boolean = betsConfig.lookupEnabled

  override def delayedInit(): Boolean = false

  override def scheduleInterval(): FiniteDuration = betsConfig.interval

  override def runScheduled(): Future[Unit] = {
    logger.debug("Refresh user bets mapping")

    val userBets = sbtechBets.getBets
    logger.debug("SBTech bets from cache: {}", userBets.size)

    userEventBets = userBets
      .groupBy(_.bet.customerId)
      .mapValues(_.groupBy(_.selection.gameId))
    logger.info("After refresh user bets mapping: {}", userEventBets.size)

    Future.unit
  }

  def getMapping: Future[Map[Long, Map[Long, Seq[InBetSelection]]]] = {
    Future.successful(userEventBets)
  }
}