package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette.MessageConverters._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import play.api.libs.json.{JsValue, Json}

class ResponseSerializer extends LazyLogging {
  def toJson(value: BaseResponse): JsValue = {
    val result = value match {
      case req: EventStateResp => Json.toJson(req)
      case req: CalculateReturnResp => Json.toJson(req)
      case req: PlaceBetsResp => Json.toJson(req)
      case req: FailureResp => Json.toJson(req)
    }

    logger.info("Returning response: {}", result.toString())
    result
  }
}
