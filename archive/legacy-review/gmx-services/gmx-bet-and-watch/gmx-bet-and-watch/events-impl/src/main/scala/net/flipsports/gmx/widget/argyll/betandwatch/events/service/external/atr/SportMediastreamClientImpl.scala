package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.atr.dto.EventType.EventType
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import org.apache.commons.codec.digest.{DigestUtils, MessageDigestAlgorithms}
import play.api.libs.json.{JsValue, Json}
import sttp.client._

import scala.concurrent.{ExecutionContext, Future}


class SportMediastreamClientImpl(apiConfig: SportMediastreamConfig, userEncryption: UserEncryption)
                                (implicit backend: SttpBackend[Future, Nothing, NothingT], ec: ExecutionContext)
  extends SportMediastreamClient with SttpCallOps {

  private val timeFormat = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

  private val md5 = new DigestUtils(MessageDigestAlgorithms.MD5)

  override def callFindEvents(from: LocalDateTime, to: LocalDateTime): Future[JsValue] = {
    val fromParam = timeFormat.format(from)
    val toParam = timeFormat.format(to)

    val request = basicRequest.get(
      uri"${apiConfig.url}/FindEvents?PartnerCode=${apiConfig.partnerCode}&Password=${apiConfig.password}&StartDateTime=$fromParam&EndDateTime=$toParam&format=json")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) =>
            logger.debug("Received events: {}", s)
            parseResponse(s)
        }
      })
  }


  override def callGetStreamingURLs(providerEventId: String, userId: String, partner: String, eventType: EventType): Future[JsValue] = {
    val userHash = userEncryption.hashUserID(partner, userId)
    val key = generateKey(providerEventId, userHash, eventType)
    val request = basicRequest.get(
      uri"${apiConfig.url}/GetStreamingURLs?EventId=$providerEventId&EventType=$eventType&UserID=$userHash&PartnerCode=${apiConfig.partnerCode}&key=$key&MediaFormat=HLS&format=json")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) =>
            logger.debug("Received stream URLs: {}", s)
            parseResponse(s)
        }
      })
  }

  private def generateKey(providerEventId: String, userId: String, eventType: EventType) = {
    val key = s"${apiConfig.partnerCode}:$providerEventId:${eventType.toString.substring(0, 1)}:$userId:${apiConfig.seed}"

    md5.digestAsHex(key)
  }

  private def parseResponse(input: String): JsValue = {
    val response: JsValue = Json.parse(input)
    val successful = response("IsOK").as[Boolean]
    if (successful) {
      response
    } else {
      throwServiceException(response("Error").toString())
    }
  }

  private def throwServiceException(msg: String): JsValue = {
    throw new ATRServiceException(msg)
  }
}