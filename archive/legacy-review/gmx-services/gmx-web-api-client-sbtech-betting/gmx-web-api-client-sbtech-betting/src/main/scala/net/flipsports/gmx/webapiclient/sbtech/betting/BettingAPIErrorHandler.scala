package net.flipsports.gmx.webapiclient.sbtech.betting

import com.softwaremill.sttp.Response
import net.flipsports.gmx.common.webapi.ExternalCallException
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClientConverters._
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.PlaceBetsError
import play.api.libs.json.{ JsError, JsSuccess, Json }

trait BettingAPIErrorHandler {

  def handleException(response: Response[String]): PlaceBetsError = {
    val body = response.body.left.get
    response.code match {
      case 401 | 403 => throw new ExternalCallException(s"Missing or invalid JWT token: $body")
      case _         => parseErrorMessage(body)
    }
  }

  private def parseErrorMessage(body: String): PlaceBetsError = {
    Json.parse(body).validate[PlaceBetsError] match {
      case s: JsSuccess[PlaceBetsError] =>
        s.value
      case e: JsError => throw new ExternalCallException(s"UNHANDLED: $body ERROR: $e")
    }
  }
}
