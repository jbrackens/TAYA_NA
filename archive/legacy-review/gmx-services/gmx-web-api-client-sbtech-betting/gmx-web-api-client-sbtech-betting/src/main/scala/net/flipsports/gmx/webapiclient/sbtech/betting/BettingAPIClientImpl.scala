package net.flipsports.gmx.webapiclient.sbtech.betting

import com.softwaremill.sttp._
import net.flipsports.gmx.common.webapi.SttpCallOps
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClientConverters._
import net.flipsports.gmx.webapiclient.sbtech.betting.config._
import net.flipsports.gmx.webapiclient.sbtech.betting.dto.{ PlaceBetsError, PlaceBetsRequest, PlaceBetsResponse }
import play.api.libs.json.Json

import scala.concurrent.{ ExecutionContext, Future }

class BettingAPIClientImpl(apiConfig: BettingAPIConfig)(
    implicit backend: SttpBackend[Future, Nothing],
    ec: ExecutionContext)
    extends BettingAPIClient
    with BettingAPIErrorHandler
    with SttpCallOps {

  override def callPlaceBets(
      playerToken: String,
      request: PlaceBetsRequest): Future[Either[PlaceBetsError, PlaceBetsResponse]] = {
    val httpCall = sttp
      .post(uri"${apiConfig.url}/placeBets")
      .contentType(MediaTypes.Json)
      .body(prepareBody(request))
      .auth
      .bearer(playerToken)

    logRequest(httpCall)

    httpCall
      .send()
      .map(response => {
        logger.debug("Received response: {}", response)
        response.body match {
          case Left(_)  => Left(handleException(response))
          case Right(s) => Right(parseResponse[PlaceBetsResponse](s))
        }
      })
  }

  private def prepareBody(request: PlaceBetsRequest): String =
    Json.toJson(request).toString()
}
