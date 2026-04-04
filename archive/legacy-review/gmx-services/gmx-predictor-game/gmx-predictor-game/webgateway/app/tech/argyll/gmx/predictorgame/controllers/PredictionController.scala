package tech.argyll.gmx.predictorgame.controllers

import java.sql.Timestamp
import java.time.ZonedDateTime

import javax.inject.{Inject, Singleton}
import play.api.libs.functional.syntax.{unlift, _}
import play.api.libs.json._
import play.api.mvc.{InjectedController, Result}
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api._
import tech.argyll.gmx.predictorgame.controllers.ImplicitConverters._
import tech.argyll.gmx.predictorgame.domain.model.SportType
import tech.argyll.gmx.predictorgame.services.auth.AuthenticatedAction
import tech.argyll.gmx.predictorgame.services.prediction.Evaluation.Evaluation
import tech.argyll.gmx.predictorgame.services.prediction.PrizeQualification.PrizeQualification
import tech.argyll.gmx.predictorgame.services.prediction.RoundStatus.RoundStatus
import tech.argyll.gmx.predictorgame.services.prediction._

import scala.concurrent.ExecutionContext

@Singleton
class PredictionController @Inject()(authAction: AuthenticatedAction, time: TimeService,
                                     service: IPredictionService)
                                    (implicit ec: ExecutionContext)
  extends InjectedController
    with ResponseOps {

  implicit val eventSelectionConverter: Format[EventSelection] = (
    (__ \ "index").format[Int] and
      (__ \ "id").format[String] and
      (__ \ "details").format[JsValue]
    ) (EventSelection.apply, unlift(EventSelection.unapply))
  implicit val eventPredictionConverter: Format[EventPrediction] = (
    (__ \ "eventId").format[String] and
      (__ \ "startTime").format[ZonedDateTime](DefaultZonedDateTimeWrites) and
      (__ \ "selections").format[Vector[EventSelection]] and
      (__ \ "confidencePoints").format[Int] and
      (__ \ "userSelectionId").formatNullable[String] and
      (__ \ "status").format[String] and
      (__ \ "locked").format[Boolean] and
      (__ \ "winnerId").formatNullable[String] and
      (__ \ "evaluation").formatNullable[Evaluation] and
      (__ \ "score").formatNullable[Int] and
      (__ \ "details").format[JsValue]
    ) (EventPrediction.apply, unlift(EventPrediction.unapply))
  implicit val roundPredictionConverter: Format[RoundPrediction] = (
    (__ \ "status").format[RoundStatus] and
      (__ \ "prizeQualification").formatNullable[PrizeQualification] and
      (__ \ "predictions").format[Seq[EventPrediction]]
    ) (RoundPrediction.apply, unlift(RoundPrediction.unapply))
  implicit val roundPredictionResponseConverter: Format[ApiResponse[RoundPrediction]] = Json.format[ApiResponse[RoundPrediction]]

  implicit val selectedPredictionConverter: Format[SelectedPrediction] = (
    (__ \ "eventId").format[String] and
      (__ \ "confidencePoints").format[Int] and
      (__ \ "selectionId").formatNullable[String]
    ) (SelectedPrediction.apply, unlift(SelectedPrediction.unapply))
  implicit val selectedPredictionRequestConverter: Format[ApiRequest[Seq[SelectedPrediction]]] = Json.format[ApiRequest[Seq[SelectedPrediction]]]

  private def validateJson[A: Reads] = parse.json.validate(
    _.validate[A].asEither.left.map(e => BadRequest(JsError.toJson(e)))
  )


  def getRoundPrediction(sport: String, competition: String, round: Int) = {
    getRoundPredictionRaw(sport, competition, round,
      result => Ok(success(result)))
  }

  protected def getRoundPredictionRaw(sport: String, competition: String, round: Int,
                                      resultMapper: RoundPrediction => Result) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    authAction.async { request =>
      service.getPredictions(competition, round, request.user).map(resultMapper)
    }
  }

  def storeRoundPrediction(sport: String, competition: String, round: Int) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    authAction(validateJson[ApiRequest[Seq[SelectedPrediction]]]).async { request =>
      service.storePredictions(competition, round, request.user, request.body.data).map(_ => Created)
    }
  }

  def removeRoundPrediction(sport: String, competition: String, round: Int) = {
    implicit val currentTime = Timestamp.valueOf(time.getCurrentTime)
    implicit val sportType = SportType.withName(sport)

    authAction.async { request =>
      service.removePredictions(competition, round, request.user).map(_ => Ok)
    }
  }
}




