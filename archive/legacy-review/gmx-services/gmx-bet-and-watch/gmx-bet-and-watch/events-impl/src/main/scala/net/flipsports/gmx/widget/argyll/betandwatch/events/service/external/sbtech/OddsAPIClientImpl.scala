package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import play.api.libs.json.{JsValue, Json}
import sttp.client._
import sttp.model.MediaType

import scala.concurrent.{ExecutionContext, Future}

class OddsAPIClientImpl(apiConfig: OddsAPIConfig)
                       (implicit backend: SttpBackend[Future, Nothing, NothingT], ec: ExecutionContext)
  extends OddsAPIClient with SttpCallOps {

  private val timeFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

  def callMarkets(to: LocalDateTime): Future[JsValue] = {
    val request = basicRequest.post(uri"${apiConfig.url}/markets")
      .contentType(MediaType.ApplicationJson)
      .body(marketsRequest(to))

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseResponse(s)
        }
      })
  }

  //TODO IDs should not be hardcoded here, but it will be rewritten to kafka eventually
  private def marketsRequest(to: LocalDateTime): String =
    s"""
       |{
       |  "OddsStyle": "fractional",
       |  "IncludeEachWay": 0,
       |  "Sports": [
       |    {
       |      "id": 61
       |    },
       |    {
       |      "id": 66
       |    }
       |  ],
       |  "MarketTypes": [
       |    {
       |      "id": 3410018
       |    },
       |    {
       |      "id": 3410020
       |    },
       |    {
       |      "id": 3410022
       |    },
       |    {
       |      "id": 3410024
       |    },
       |    {
       |      "id": 3410026
       |    },
       |    {
       |      "id": 3410028
       |    }
       |  ],
       |  "TimeFilterToDate": "${timeFormat.format(to)}"
       |}
      """.stripMargin

  private def parseResponse(input: String): JsValue = {
    Json.parse(input)
  }

  override def callCountries(): Future[JsValue] = {
    val request = basicRequest.get(uri"${apiConfig.url}/countries")
      .contentType(MediaType.ApplicationJson)

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseResponse(s)
        }
      })
  }
}
