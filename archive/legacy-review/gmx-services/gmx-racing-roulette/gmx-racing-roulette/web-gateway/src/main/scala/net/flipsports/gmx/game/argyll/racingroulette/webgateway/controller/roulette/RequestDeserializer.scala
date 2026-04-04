package net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.controller.roulette.MessageConverters._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.{CalculateReturn, EventUpdate, PlaceBets, SubscribeEvent}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request._
import play.api.libs.json.{JsResult, JsValue}

class RequestDeserializer extends LazyLogging {
  def fromJson(req: JsValue): JsResult[BaseRequest] = {

    logger.info("Received request: {}", req.toString())

    val reqType = (req \ "meta" \ "operation").as[Operation]
    val result = reqType match {
      case SubscribeEvent => req.validate[SubscribeEventReq]
      case EventUpdate => req.validate[EventUpdateReq]
      case CalculateReturn => req.validate[CalculateReturnReq]
      case PlaceBets => req.validate[PlaceBetsReq]
    }
    result
  }
}
