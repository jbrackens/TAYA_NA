package tech.argyll.gmx.predictorgame.engine.team

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.EventsRow
import tech.argyll.gmx.predictorgame.domain.repository.RoundRepository
import tech.argyll.gmx.predictorgame.engine.ScoreCalculator
import tech.argyll.gmx.predictorgame.engine.team.leaderboard.LeaderboardCalculator

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class ProcessorEngine @Inject()(val config: DatabaseConfig[JdbcProfile],
                                eventUpdater: EventUpdater,
                                scoreCalculator: ScoreCalculator,
                                leaderboardCalculator: LeaderboardCalculator,
                                roundRepository: RoundRepository)
                               (implicit ec: ExecutionContext)
  extends LazyLogging {

  import config.profile.api._

  def handleEventUpdate(eventUpdate: EventUpdate): Future[Any] = {
    for {
      event <- eventUpdater.findDbEntry(eventUpdate)
        .map(eventUpdater.shouldUpdate(_, eventUpdate))
      result <- event.map(processChange(_, eventUpdate))
        .getOrElse(Future.successful(Unit))
    } yield result
  }

  private def processChange(event: EventsRow, eventUpdate: EventUpdate) = {
    logger.info(s"Processing: $eventUpdate")
    val batch = for {
      round <- roundRepository.getRound(event.roundId)
      updatedEvent <- eventUpdater.applyChanges(event, eventUpdate)
      _ <- eventUpdater.store(updatedEvent)
      _ <- scoreCalculator.recalculateScores(updatedEvent)
      _ <- leaderboardCalculator.calculateRound(event.roundId)
      _ <- leaderboardCalculator.calculateCompetition(round.competitionId)
    } yield ()

    config.db.run(batch.transactionally)
  }
}