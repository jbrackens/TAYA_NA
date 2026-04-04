package tech.argyll.gmx.predictorgame.controllers

import java.time.ZonedDateTime

import javax.inject.{Inject, Singleton}
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json._
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.{ApiRequest, ApiResponse}
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters._
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018
import tech.argyll.gmx.predictorgame.domain.model.SportType.FOOTBALL
import tech.argyll.gmx.predictorgame.domain.model.team.TeamCompetitionSelectionDetails
import tech.argyll.gmx.predictorgame.services.auth.AuthenticatedAction
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation
import tech.argyll.gmx.predictorgame.services.prediction.PrizeQualification.PrizeQualification
import tech.argyll.gmx.predictorgame.services.prediction.RoundStatus.RoundStatus
import tech.argyll.gmx.predictorgame.services.prediction._

import scala.concurrent.ExecutionContext

@Singleton
class PredictionControllerV2 @Inject()(authAction: AuthenticatedAction, time: TimeService,
                                       service: IPredictionService)
                                      (implicit ec: ExecutionContext)
  extends PredictionController(authAction, time, service) {

  implicit val teamV2Converter: Format[TeamV2] = Json.format[TeamV2]

  implicit val eventPredictionV2Converter: Format[EventPredictionV2] = (
    (__ \ "event_id").format[String] and
      (__ \ "start_time").format[ZonedDateTime](DefaultZonedDateTimeWrites) and
      (__ \ "home_team").format[TeamV2] and
      (__ \ "away_team").format[TeamV2] and
      (__ \ "confidence_points").format[Int] and
      (__ \ "selection_id").formatNullable[String] and
      (__ \ "status").format[String] and
      (__ \ "locked").format[Boolean] and
      (__ \ "winner_id").formatNullable[String] and
      (__ \ "evaluation").formatNullable[Evaluation] and
      (__ \ "score").formatNullable[Int]
    ) (EventPredictionV2.apply, unlift(EventPredictionV2.unapply))
  implicit val roundPredictionV2Converter: Format[RoundPredictionV2] = (
    (__ \ "status").format[RoundStatus] and
      (__ \ "prize_qualification").formatNullable[PrizeQualification] and
      (__ \ "predictions").format[Seq[EventPredictionV2]]
    ) (RoundPredictionV2.apply, unlift(RoundPredictionV2.unapply))
  implicit val roundPredictionV2ResponseConverter: Format[ApiResponse[RoundPredictionV2]] = Json.format[ApiResponse[RoundPredictionV2]]

  override implicit val selectedPredictionConverter: Format[SelectedPrediction] = (
    (__ \ "event_id").format[String] and
      (__ \ "confidence_points").format[Int] and
      (__ \ "selection_id").formatNullable[String]
    ) (SelectedPrediction.apply, unlift(SelectedPrediction.unapply))
  override implicit val selectedPredictionRequestConverter: Format[ApiRequest[Seq[SelectedPrediction]]] = Json.format[ApiRequest[Seq[SelectedPrediction]]]

  override def getRoundPrediction(sport: String, competition: String, round: Int) = {
    super.getRoundPredictionRaw(FOOTBALL.toString, COMPETITION_NFL2018.toString, round,
      result => Ok(success(translateRound(result))))
  }

  override def storeRoundPrediction(sport: String, competition: String, round: Int) = {
    super.storeRoundPrediction(FOOTBALL.toString, COMPETITION_NFL2018.toString, round)
  }

  override def removeRoundPrediction(sport: String, competition: String, round: Int) = {
    super.removeRoundPrediction(FOOTBALL.toString, COMPETITION_NFL2018.toString, round)
  }


  protected def translateRound(source: RoundPrediction): RoundPredictionV2 = {
    RoundPredictionV2(source.status, source.prizeQualification,
      source.predictions.map(translateEvent))
  }

  protected def translateEvent(source: EventPrediction): EventPredictionV2 = {
    EventPredictionV2(source.id, source.startTime,
      translateSelection(source.selections(0)),
      translateSelection(source.selections(1)),
      source.points, source.selection, source.matchStatus, source.locked,
      source.winner, source.evaluation, source.score)
  }

  protected def translateSelection(source: EventSelection): TeamV2 = {
    val details = TeamCompetitionSelectionDetails.readJsValue(source.details)
    TeamV2(source.id, details.name, details.score)
  }

  case class RoundPredictionV2(status: RoundStatus, prizeQualification: Option[PrizeQualification],
                             predictions: Seq[EventPredictionV2])

  case class EventPredictionV2(id: String, startTime: ZonedDateTime, home: TeamV2, away: TeamV2,
                               points: Int, selection: Option[String],
                               matchStatus: String, locked: Boolean, winner: Option[String],
                               evaluation: Option[Evaluation], score: Option[Int])

  case class TeamV2(id: String, name: String, score: Option[Int])
}



