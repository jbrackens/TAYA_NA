package tech.argyll.gmx.predictorgame.engine

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{EventPredictions, EventsRow}

import scala.concurrent.ExecutionContext

@Singleton
class ScoreCalculator @Inject()(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext)
  extends LazyLogging {

  import config.profile.api.{actionBasedSQLInterpolation, _}

  def recalculateScores(event: EventsRow): DBIO[Unit] = {
    logger.info(s"Recalculate score")
    val batch = for {
      _ <- resetRelatedPredictionsScore(event.id)
      _ <- updateRelatedPredictionsScore(event.id, event.winner.getOrElse(ScoreCalculator.noWinnerUnknown))
      _ <- clearEmptySelectionsScore(event.id)
      _ <- updateRelatedUsersScore(event.roundId)
    } yield ()

    batch.transactionally
  }

  //TODO fix schema issue...
  val schema: String = EventPredictions.baseTableRow.schemaName.get

  private def resetRelatedPredictionsScore(eventId: String): DBIO[Int] =
    sql"""UPDATE predictor.event_predictions
         | SET score = 0
         | WHERE event_id = $eventId AND selection IS NOT NULL"""
      .stripMargin.asUpdate

  private def updateRelatedPredictionsScore(eventId: String, winner: String): DBIO[Int] =
    sql"""UPDATE predictor.event_predictions
         | SET score = points
         | WHERE event_id = $eventId
         |  AND (selection = $winner OR 'NO_WINNER_DEAD_HEAT' = $winner)"""
      .stripMargin.asUpdate

  private def clearEmptySelectionsScore(eventId: String): DBIO[Int] =
    sql"""UPDATE predictor.event_predictions
         | SET score = NULL
         | WHERE event_id = $eventId AND selection IS NULL"""
      .stripMargin.asUpdate

  private def updateRelatedUsersScore(roundId: String): DBIO[Int] =
    sql"""UPDATE predictor.user_predictions
         | SET score = picks.score,
         |    correct_selections = picks.picks_correct
         | FROM (SELECT up.id,
         |             sum(ep.score) score,
         |             count(up.id) FILTER (WHERE ep.selection IS NOT NULL) AS picks_submitted,
         |             count(up.id) FILTER (WHERE ep.score > 0)             AS picks_correct
         |      FROM predictor.user_predictions AS up
         |             JOIN predictor.event_predictions ep ON up.id = ep.prediction_id
         |      GROUP BY up.id
         |     ) AS picks
         | WHERE user_predictions.id = picks.id
         | AND user_predictions.round_id = $roundId"""
      .stripMargin.asUpdate
}

object ScoreCalculator {
  val noWinnerUnknown = "NO_WINNER_UNKNOWN"
  val noWinnerDraw = "NO_WINNER_DRAW"
  val noWinnerDeadHeat = "NO_WINNER_DEAD_HEAT"
}
