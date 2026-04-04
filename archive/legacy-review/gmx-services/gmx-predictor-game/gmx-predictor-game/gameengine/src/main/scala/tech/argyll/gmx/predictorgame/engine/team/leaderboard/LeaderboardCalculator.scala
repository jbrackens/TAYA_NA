package tech.argyll.gmx.predictorgame.engine.team.leaderboard

import com.typesafe.scalalogging.LazyLogging
import javax.inject.{Inject, Singleton}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.{LeaderboardEntry, LeaderboardEntryRow, LeaderboardRow, UserPredictions, UserPredictionsRow, Users, UsersRow}
import tech.argyll.gmx.predictorgame.common.uuid.UUIDGenerator
import tech.argyll.gmx.predictorgame.domain.repository.LeaderboardRepository
import tech.argyll.gmx.predictorgame.engine.BusinessConditions

import scala.concurrent.ExecutionContext

@Singleton
class LeaderboardCalculator @Inject()(val config: DatabaseConfig[JdbcProfile],
                                      leaderboardRepo: LeaderboardRepository)(implicit ec: ExecutionContext)
  extends BusinessConditions with LeaderboardOps
    with LazyLogging with ExtensionMethodConversions {

  import config.profile.api._

  def calculateRound(roundId: String): DBIO[Unit] = {
    for {
      leaderboard <- leaderboardRepo.getRoundLeaderboard(roundId)
      userScores <- getRoundScores(roundId)
      entries <- storeEntries(userScores.map(wrapUserScore), leaderboard)
    } yield entries
  }

  private def getRoundScores(roundId: String) = {
    val query = for {
      userPredictions <- UserPredictions.filter(_.score.isDefined) if userPredictions.roundId === roundId
      user <- Users if user.id === userPredictions.userId
    } yield (user, userPredictions.score.get, userPredictions.prizeEligible)

    query.result
  }


  def calculateCompetition(competitionId: String): DBIO[Unit] = {
    for {
      leaderboard <- leaderboardRepo.getCompetitionLeaderboard(competitionId)
      userScores <- getSeasonScores()
      aggregated = aggregate(userScores)
      entries <- storeEntries(aggregated.map(wrapUserScore), leaderboard)
    } yield entries
  }

  private def getSeasonScores() = {
    val query = for {
      user <- Users
      userPredictions <- UserPredictions
        .filter(_.score.isDefined)
        .filter(_.prizeEligible)
      if user.id === userPredictions.userId
    } yield (user, userPredictions)

    query.result
  }

  def aggregate(userScores: Seq[(UsersRow, UserPredictionsRow)]) = {
    userScores
      .groupBy(_._1.id)
      .map {
        case (_, singleUserScores) => {
          val representative = singleUserScores.head._1
          (representative,
            singleUserScores
              .map(_._2.score.get)
              .sorted.reverse
              .take(12)
              .sum,
            true
          )
        }
      }.toSeq
  }

  private def wrapUserScore(scoredRow: (UsersRow, Score, Boolean)) =
    UserScore(scoredRow._1, scoredRow._2, scoredRow._3)

  private def storeEntries(userScores: Seq[UserScore], leaderboard: LeaderboardRow): DBIO[Unit] = {
    val standings = calculateStandings(userScores)
      .map {
        case (position, UserScore(user, score, _)) => LeaderboardEntryRow(UUIDGenerator.uuid(), leaderboard.id, user.id, score, position)
      }

    val query = for {
      _ <- LeaderboardEntry.filter(_.leaderboardId === leaderboard.id).delete
      _ <- LeaderboardEntry ++= standings
    } yield ()

    query.transactionally
  }
}