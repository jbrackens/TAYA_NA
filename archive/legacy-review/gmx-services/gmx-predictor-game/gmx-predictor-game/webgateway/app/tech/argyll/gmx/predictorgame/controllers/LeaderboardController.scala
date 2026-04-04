package tech.argyll.gmx.predictorgame.controllers

import java.sql.Timestamp

import javax.inject.{Inject, Singleton}
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json._
import play.api.mvc.InjectedController
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.{ApiResponse, ResponseOps}
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters._
import tech.argyll.gmx.predictorgame.domain.model.SportType
import tech.argyll.gmx.predictorgame.services.auth.AuthenticatedAction
import tech.argyll.gmx.predictorgame.services.leaderboard.{ILeaderboardService, LeaderboardEntry}
import tech.argyll.gmx.predictorgame.services.overview._
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation

import scala.concurrent.ExecutionContext

@Singleton
class LeaderboardController @Inject()(authAction: AuthenticatedAction, time: TimeService,
                                      service: ILeaderboardService)
                                     (implicit ec: ExecutionContext)
  extends InjectedController
    with ResponseOps {

  implicit val overviewConverter: Format[OverviewEntry] = (
    (__ \ "eventId").format[String] and
      (__ \ "title").format[String] and
      (__ \ "confidencePoints").format[Int] and
      (__ \ "selectionId").formatNullable[String] and
      (__ \ "status").format[String] and
      (__ \ "evaluation").formatNullable[Evaluation]
    ) (OverviewEntry.apply, unlift(OverviewEntry.unapply))

  implicit val entryConverter: Format[LeaderboardEntry] = (
    (__ \ "userId").format[String] and
      (__ \ "username").format[String] and
      (__ \ "totalScore").format[Int] and
      (__ \ "totalWon").format[Int] and
      (__ \ "totalLoss").format[Int] and
      (__ \ "position").formatNullable[Int] and
      (__ \ "isMe").format[Boolean] and
      (__ \ "picks").format[Seq[OverviewEntry]]
    ) (LeaderboardEntry.apply, unlift(LeaderboardEntry.unapply))
  implicit val entryListResponseConverter: Format[ApiResponse[Seq[LeaderboardEntry]]] = Json.format[ApiResponse[Seq[LeaderboardEntry]]]

  def getRoundStanding(sport: String, competition: String, round: Int) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    authAction.async { request =>
      service.calculateRound(competition, round, request.user).map(result => Ok(success(result)))
    }
  }

  def getSeasonStanding(sport: String, competition: String) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    authAction.async { request =>
      service.calculateSeason(competition, request.user).map(result => Ok(success(result)))
    }
  }
}
