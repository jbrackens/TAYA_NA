package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.sis

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import org.apache.commons.codec.digest.{HmacAlgorithms, HmacUtils}
import play.api.libs.json.{JsValue, Json}
import sttp.client._

import scala.concurrent.{ExecutionContext, Future}

class SISStreamClientImpl(apiConfig: StreamAPIConfig, userEncryption: UserEncryption)
                         (implicit backend: SttpBackend[Future, Nothing, NothingT], ec: ExecutionContext)
  extends SISStreamClient with SttpCallOps {

  private val hmac = new HmacUtils(HmacAlgorithms.HMAC_SHA_1, apiConfig.seed)

  override def callStreamingEvents(): Future[JsValue] = {
    val query = s"?customer=${apiConfig.customer}"
    val queryWithToken = appendToken(query)
    val uri = s"${apiConfig.url}/StreamingEvents$queryWithToken"

    val request = basicRequest.get(uri"$uri")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseResponse(s)
        }
      })
  }

  override def callStream(providerEventId: String, userId: String, partner: String): Future[JsValue] = {
    val userHash = userEncryption.hashUserID(partner, userId)
    val query = s"?customer=${apiConfig.customer}&username=$userHash&streamId=$providerEventId"
    val queryWithToken = appendToken(query)
    val uri = s"${apiConfig.url}/stream$queryWithToken"

    val request = basicRequest.get(uri"$uri")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseResponse(s)
        }
      })
  }

  private def appendToken(query: String) = {
    val hash = hmac.hmacHex(s"$query")
    val token = s"0${hash.substring(0, 20)}"

    s"$query&token=$token"
  }

  private def parseResponse(input: String): JsValue = {
    Json.parse(input)
  }

}