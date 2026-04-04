package tech.argyll.gmx.predictorgame.controllers

import javax.inject.{Inject, Singleton}
import play.api.libs.json._
import tech.argyll.gmx.predictorgame.common.TimeService
import tech.argyll.gmx.predictorgame.common.play.api.ApiResponse
import tech.argyll.gmx.predictorgame.domain.model.LegacyConstants.COMPETITION_NFL2018
import tech.argyll.gmx.predictorgame.domain.model.SportType.FOOTBALL
import tech.argyll.gmx.predictorgame.services.auth.AuthenticatedAction
import tech.argyll.gmx.predictorgame.services.prediction._

import scala.concurrent.ExecutionContext

@Singleton
class PredictionControllerV1 @Inject()(authAction: AuthenticatedAction, time: TimeService,
                                       service: IPredictionService)
                                      (implicit ec: ExecutionContext)
  extends PredictionControllerV2(authAction, time, service) {

  implicit val eventPredictionListResponseConverter: Format[ApiResponse[Seq[EventPredictionV2]]] = Json.format[ApiResponse[Seq[EventPredictionV2]]]

  override def getRoundPrediction(sport: String, season: String, round: Int) = {
    getRoundPredictionRaw(FOOTBALL.toString, COMPETITION_NFL2018.toString, round,
      result => Ok(success(result.predictions.map(translateEvent))))
  }
}



