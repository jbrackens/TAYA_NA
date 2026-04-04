package tech.argyll.gmx.predictorgame.controllers

import java.sql.Timestamp
import java.time.{ZoneId, ZonedDateTime}

import javax.inject._
import play.api.libs.functional.syntax._
import play.api.libs.json.{Json, _}
import play.api.mvc._
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.{ApiResponse, ResponseOps}
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters._
import tech.argyll.gmx.predictorgame.domain.model.SportType
import tech.argyll.gmx.predictorgame.domain.model.SportType.SportType
import tech.argyll.gmx.predictorgame.services.competition.{CompetitionStatus, ICompetitionService}
import tech.argyll.gmx.predictorgame.services.leaderboard.ILeaderboardService

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class CompetitionController @Inject()(time: TimeService, competitionService: ICompetitionService, leaderboardService: ILeaderboardService)
                                     (implicit ec: ExecutionContext)
  extends InjectedController
    with ResponseOps {

  implicit val statusConverter: Format[CompetitionStatus] = (
    (__ \ "roundCurrent").format[Int] and
      (__ \ "roundMax").format[Int] and
      (__ \ "roundDeadline").formatNullable[ZonedDateTime](DefaultZonedDateTimeFormat) and
      (__ \ "leaderboardRoundAvailable").formatNullable[Int]
    ) (CompetitionStatus.apply, unlift(CompetitionStatus.unapply))
  implicit val statusResponseConverter: Format[ApiResponse[CompetitionStatus]] = Json.format[ApiResponse[CompetitionStatus]]

  def status(sport: String, competition: String) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    Action.async {
      checkStatus(competition).map(result => Ok(success(result)))
    }
  }

  private def checkStatus(competition: String)(implicit sportType: SportType, currentTime: Timestamp): Future[CompetitionStatus] = for {
    currentRound <- competitionService.currentRound(competition)
    max <- competitionService.maxRounds(competition)
    availableLeaderboard <- leaderboardService.availableRound(competition)
    // TODO get minimum round from DB
  } yield CompetitionStatus(currentRound.map(_.number).getOrElse(1), max.getOrElse(-1),
    currentRound.flatMap(_.pickDeadline).map(getLocalDateTime), availableLeaderboard)


  private def getLocalDateTime(time: Timestamp) =
    ZonedDateTime.ofInstant(time.toInstant, ZoneId.of("UTC"))

}