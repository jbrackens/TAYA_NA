package tech.argyll.gmx.predictorgame.controllers

import java.time.ZonedDateTime

import javax.inject._
import play.api.libs.functional.syntax._
import play.api.libs.json.{Format, Json, __}
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.ApiResponse
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters.DefaultZonedDateTimeFormat
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018
import tech.argyll.gmx.predictorgame.domain.model.SportType.FOOTBALL
import tech.argyll.gmx.predictorgame.services.competition.{CompetitionStatus, ICompetitionService}
import tech.argyll.gmx.predictorgame.services.leaderboard.ILeaderboardService

import scala.concurrent.ExecutionContext

@Singleton
class CompetitionControllerV2 @Inject()(time: TimeService, competitionService: ICompetitionService, leaderboardService: ILeaderboardService)
                                       (implicit ec: ExecutionContext)
  extends CompetitionController(time, competitionService, leaderboardService) {

  override implicit val statusConverter: Format[CompetitionStatus] = (
    (__ \ "round_current").format[Int] and
      (__ \ "round_max").format[Int] and
      (__ \ "round_deadline").formatNullable[ZonedDateTime](DefaultZonedDateTimeFormat) and
      (__ \ "leaderboard_round_available").formatNullable[Int]
    ) (CompetitionStatus.apply, unlift(CompetitionStatus.unapply))
  override implicit val statusResponseConverter: Format[ApiResponse[CompetitionStatus]] = Json.format[ApiResponse[CompetitionStatus]]

  override def status(sport: String, competition: String) = {
    super.status(FOOTBALL.toString, COMPETITION_NFL2018.toString)
  }

}