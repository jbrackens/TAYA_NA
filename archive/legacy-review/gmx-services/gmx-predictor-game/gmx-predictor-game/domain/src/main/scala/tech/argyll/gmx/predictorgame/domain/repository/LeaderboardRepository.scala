package tech.argyll.gmx.predictorgame.domain.repository

import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import tech.argyll.gmx.predictorgame.Tables.{Leaderboard, LeaderboardEntry, LeaderboardEntryRow, LeaderboardRow, Users, UsersRow}

import scala.concurrent.ExecutionContext

class LeaderboardRepository(val config: DatabaseConfig[JdbcProfile])(implicit ec: ExecutionContext) {

  import config.profile.api._

  def getCompetitionLeaderboard(competitionId: String): DBIO[LeaderboardRow] = {
    Queries.seasonLeaderboard(competitionId).result.head
  }

  def findSeasonLeaderboardEntries(competitionId: String): DBIO[Seq[(LeaderboardEntryRow, UsersRow)]] = {
    Queries.entriesInSeason(competitionId).result
  }

  def getRoundLeaderboard(roundId: String): DBIO[LeaderboardRow] = {
    Queries.roundLeaderboard(roundId).result.head
  }

  def findRoundLeaderboardEntries(roundId: String): DBIO[Seq[(LeaderboardEntryRow, UsersRow)]] = {
    Queries.entriesByRound(roundId).result
  }

  object Queries {
    type LeaderboardQuery = Query[Leaderboard, LeaderboardRow, Seq]
    type LeaderboardWithUserQuery = Query[(LeaderboardEntry, Users), (LeaderboardEntryRow, UsersRow), Seq]

    def roundLeaderboard(roundId: String): LeaderboardQuery =
      Leaderboard
        .filter(_.roundId === roundId)

    def entriesByRound(roundId: String): LeaderboardWithUserQuery = {
      fromTopPosition(
        entriesForLeaderboard(
          roundLeaderboard(roundId)))
    }

    def seasonLeaderboard(competitionId: String): LeaderboardQuery =
      Leaderboard
        .filter(_.competitionId === competitionId)
        .filter(_.roundId.isEmpty)

    def entriesInSeason(competitionId: String): LeaderboardWithUserQuery = {
      fromTopPosition(
        entriesForLeaderboard(
          seasonLeaderboard(competitionId)))
    }

    private def entriesForLeaderboard(leaderboardQuery: LeaderboardQuery): LeaderboardWithUserQuery = {
      for {
        leaderboard <- leaderboardQuery
        entry <- LeaderboardEntry if leaderboard.id === entry.leaderboardId
        user <- Users if user.id === entry.userId
      } yield (entry, user)
    }

    private def fromTopPosition(leaderboardQuery: LeaderboardWithUserQuery): LeaderboardWithUserQuery = {
      leaderboardQuery
        .sortBy(r => (r._1.position.asc.nullsLast, r._2.name.asc))
    }
  }

}
