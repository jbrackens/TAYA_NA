package tech.argyll.gmx.predictorgame.controllers

import javax.inject.{Inject, Singleton}
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json.{Format, Json, __}
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.ApiResponse
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters._
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018
import tech.argyll.gmx.predictorgame.domain.model.SportType.FOOTBALL
import tech.argyll.gmx.predictorgame.services.auth.AuthenticatedAction
import tech.argyll.gmx.predictorgame.services.leaderboard.{ILeaderboardService, LeaderboardEntry}
import tech.argyll.gmx.predictorgame.services.overview.OverviewEntry
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation

import scala.concurrent.ExecutionContext

@Singleton
class LeaderboardControllerV2 @Inject()(authAction: AuthenticatedAction, time: TimeService,
                                        service: ILeaderboardService)
                                       (implicit ec: ExecutionContext)
  extends LeaderboardController(authAction, time, service) {

  override implicit val overviewConverter: Format[OverviewEntry] = (
    (__ \ "event_id").format[String] and
      (__ \ "title").format[String] and
      (__ \ "confidence_points").format[Int] and
      (__ \ "selection_id").formatNullable[String] and
      (__ \ "status").format[String] and
      (__ \ "evaluation").formatNullable[Evaluation]
    ) (OverviewEntry.apply, unlift(OverviewEntry.unapply))
  override implicit val entryConverter: Format[LeaderboardEntry] = (
    (__ \ "user_id").format[String] and
      (__ \ "username").format[String] and
      (__ \ "total_score").format[Int] and
      (__ \ "total_won").format[Int] and
      (__ \ "total_loss").format[Int] and
      (__ \ "position").formatNullable[Int] and
      (__ \ "is_me").format[Boolean] and
      (__ \ "picks").format[Seq[OverviewEntry]]
    ) (LeaderboardEntry.apply, unlift(LeaderboardEntry.unapply))
  override implicit val entryListResponseConverter: Format[ApiResponse[Seq[LeaderboardEntry]]] = Json.format[ApiResponse[Seq[LeaderboardEntry]]]

  override def getRoundStanding(sport: String, competition: String, round: Int) = {
    super.getRoundStanding(FOOTBALL.toString, COMPETITION_NFL2018.toString, round)
  }

  override def getSeasonStanding(sport: String, competition: String) = {
    super.getSeasonStanding(FOOTBALL.toString, COMPETITION_NFL2018.toString)
  }
}
