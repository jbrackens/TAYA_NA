package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sbtech

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import play.api.libs.json.{JsValue, Json}
import sttp.client._
import sttp.model.MediaType

import scala.concurrent.{ExecutionContext, Future}

class DataAPIClientImpl(apiConfig: DataAPIConfig)
                       (implicit backend: SttpBackend[Future, Nothing, NothingT], ec: ExecutionContext)
  extends DataAPIClient with SttpCallOps {

  private val timeFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

  private def playerDetailsRequest(userId: String): String =
    s"""
       |{
       |  "customerID": "$userId"
       |}
      """.stripMargin

  override def callPlayerDetails(userId: String): Future[JsValue] = withToken { token =>
    val request = basicRequest.post(uri"${apiConfig.url}/playerdetails?token=$token")
      .contentType(MediaType.ApplicationJson)
      .body(playerDetailsRequest(userId))

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => {
            logger.debug("Received playerdetails: {}", s)
            parseResponse(s)
          }
        }
      })
  }


  private def openBetsRequest(from: LocalDateTime, to: LocalDateTime): String =
  //       |  "playerUserName": "$userName",
    s"""
       |{
       |  "from": "${timeFormat.format(from)}",
       |  "to": "${timeFormat.format(to)}"
       |}
      """.stripMargin

  override def callOpenBets(from: LocalDateTime, to: LocalDateTime): Future[JsValue] = withToken { token =>
    val request = basicRequest.post(uri"${apiConfig.url}/openbets?token=$token")
      .contentType(MediaType.ApplicationJson)
      .body(openBetsRequest(from, to))

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseResponse(s)
        }
      })
  }

  private def parseResponse(input: String): JsValue = {
    Json.parse(input)
  }


  private def withToken[T](block: String => Future[T]): Future[T] = {
    for {
      token <- callGetToken
      result <- block(token)
    } yield result
  }

  private val getTokenRequest =
    s"""
       |{
       |  "agentUserName": "${apiConfig.agent}",
       |  "agentPassword": "${apiConfig.password}"
       |}
      """.stripMargin

  private def callGetToken: Future[String] = {
    val request = basicRequest.post(uri"${apiConfig.url}/gettoken")
      .contentType(MediaType.ApplicationJson)
      .body(getTokenRequest)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => Json.parse(s)
        }
      }).map(responseJSON => responseJSON("token").as[String])
  }
}

