package tech.argyll.gmx.predictorgame.services.leaderboard

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.db.slick.{DatabaseConfigProvider, HasDatabaseConfigProvider}
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile
import slick.lifted.ExtensionMethodConversions
import tech.argyll.gmx.predictorgame.Tables.{LeaderboardEntryRow, Rounds, RoundsRow, UserPredictions, UsersRow}
import tech.argyll.gmx.predictorgame.domain.model.SportType.{FOOTBALL, SportType}
import tech.argyll.gmx.predictorgame.domain.repository.{LeaderboardRepository, PredictionRepository, RoundRepository}
import tech.argyll.gmx.predictorgame.engine.BusinessConditions
import tech.argyll.gmx.predictorgame.security.auth.UserDetails
import tech.argyll.gmx.predictorgame.services.overview.IOverviewService
import tech.argyll.gmx.predictorgame.services.user.IUserService

import scala.concurrent.{ExecutionContext, Future}

trait ILeaderboardService {
  def availableRound(competition: String)(implicit currentTime: Timestamp): Future[Option[Int]]

  def calculateRound(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[LeaderboardEntry]]

  def calculateSeason(competition: String, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[LeaderboardEntry]]

}


@Singleton
class LeaderboardService @Inject()(val dbConfigProvider: DatabaseConfigProvider,
                                   roundRepo: RoundRepository, predictionRepo: PredictionRepository, leaderboardRepo: LeaderboardRepository,
                                   userService: IUserService, overviewService: IOverviewService)
                                  (implicit ec: ExecutionContext)
  extends ILeaderboardService with LeaderboardOps with BusinessConditions
    with HasDatabaseConfigProvider[JdbcProfile] with ExtensionMethodConversions {

  import profile.api._

  implicit val dbc: DatabaseConfig[JdbcProfile] = dbConfig


  override def calculateRound(competition: String, roundNo: Int, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[LeaderboardEntry]] = {
    if (!FOOTBALL.equals(sportType))
      throw new IllegalArgumentException(s"Leaderboard not implemented for sport '$sportType'")

    val leaderboard = for {
      round <- dbc.db.run(roundRepo.getRound(competition, roundNo))
      user <- userService.getUser(userDetails)
      leaderboard <- dbc.db.run(leaderboardRepo.findRoundLeaderboardEntries(round.id))
        .map(prepareLeaderboard(_, user))
        .map(pickTop(_, 30))
      reportAvailable <- reportAvailable(round, user)
    } yield
      if (!reportAvailable)
        leaderboard.map(emptyPicks)
      else
        leaderboard.map(assignPicks(competition, roundNo, _))

    leaderboard.flatMap(p => Future.sequence(p))
  }

  override def calculateSeason(competition: String, userDetails: UserDetails)(implicit sportType: SportType, currentTime: Timestamp): Future[Seq[LeaderboardEntry]] = {
    if (!FOOTBALL.equals(sportType))
      throw new IllegalArgumentException(s"Leaderboard not implemented for sport '$sportType'")

    for {
      user <- userService.getUser(userDetails)
      leaderboard <- dbc.db.run(leaderboardRepo.findSeasonLeaderboardEntries(competition))
        .map(prepareLeaderboard(_, user))
        .map(pickTop(_, 30))
    } yield leaderboard
  }

  private def reportAvailable(round: RoundsRow, currentUser: UsersRow)(implicit currentTime: Timestamp): Future[Boolean] = {
    for {
      existing <- dbc.db.run(predictionRepo.findUserPredictions(round.id, currentUser.id))
    } yield existing
      .map(isUserRoundLocked(round, _, currentTime))
      .getOrElse(isRoundLocked(round, currentTime))
  }

  private def prepareLeaderboard(leaderboard: Seq[(LeaderboardEntryRow, UsersRow)], currentUser: UsersRow)(implicit currentTime: Timestamp): List[LeaderboardEntry] = {
    leaderboard
      .map {
        case (l: LeaderboardEntryRow, u: UsersRow) => LeaderboardEntry(u.oidcSub, u.name, l.score, 0, 0, l.position, currentUser.id == l.userId, Nil)
      }
      .toList
  }

  private def assignPicks(competition: String, roundNo: Int, item: LeaderboardEntry)(implicit sportType: SportType, currentTime: Timestamp) = {
    overviewService.getUserPicks(competition, roundNo, item.userSub)
      .map(picks => item.copy(picks = picks))
  }

  private def emptyPicks(item: LeaderboardEntry) = {
    Future.successful(item)
  }

  override def availableRound(competition: String)(implicit currentTime: Timestamp): Future[Option[Int]] = {
    val query = for {
      rounds <- Rounds.filter(_.competitionId === competition)
      userPredictions <- UserPredictions.filter(_.score.isDefined).map(_.roundId)
      if rounds.id === userPredictions
    } yield rounds
    dbc.db.run(query.map(_.number).max.result)
  }
}