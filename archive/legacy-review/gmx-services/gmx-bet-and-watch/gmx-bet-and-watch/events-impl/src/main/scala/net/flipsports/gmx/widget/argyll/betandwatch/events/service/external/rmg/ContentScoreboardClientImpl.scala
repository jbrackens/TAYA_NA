package net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.rmg

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.external.encrypt.UserEncryption
import org.apache.commons.codec.binary.Base64
import org.apache.commons.codec.digest.{DigestUtils, MessageDigestAlgorithms}
import sttp.client.{NothingT, SttpBackend, basicRequest, _}

import scala.concurrent.{ExecutionContext, Future}
import scala.xml.{Elem, XML}

class ContentScoreboardClientImpl(apiConfig: ContentScoreboardConfig, userEncryption: UserEncryption)
                                 (implicit backend: SttpBackend[Future, Nothing, NothingT], ec: ExecutionContext)
  extends ContentScoreboardClient with SttpCallOps {

  private val md5 = new DigestUtils(MessageDigestAlgorithms.MD5)

  override def callEventList(): Future[Elem] = {
    val uri = s"${apiConfig.url}/streaming/eventList?version=2&days=3"

    val request = basicRequest.get(uri"$uri")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseEventsXML(s)
        }
      })
  }

  private def parseEventsXML(s: String) = {
    XML.loadString(s)
  }

  override def callAddUser(providerEventId: String, userId: String, partner: String): Future[Boolean] = {
    val userHash = userEncryption.hashUserID(partner, userId)
    val key = generateKey(providerEventId, userHash)
    val request = basicRequest.get(
      uri"${apiConfig.url}/streaming/validation/addUser/index.html?userId=$userHash&partnerId=${apiConfig.partnerId}&eventId=$providerEventId&key=$key")

    logRequest(request)

    request.send()
      .map(response => {
        response.body match {
          case Left(v) => throw new ExternalCallException(v)
          case Right(s) => parseValidationString(s)
        }
      })
  }

  private def generateKey(providerEventId: String, userId: String) = {
    val key = s"$userId${apiConfig.partnerId}${providerEventId}L${apiConfig.seed}"
    val digest = md5.digest(key)

    new String(new Base64().encode(digest))
  }

  private def parseValidationString(s: String): Boolean = s match {
    case "success" => true
    case x => throwServiceException(x)
  }

  private def throwServiceException(msg: String): Boolean = {
    throw new RMGServiceException(msg)
  }

  override def buildIframeUrl(providerEventId: String, userId: String, partner: String): String = {
    val userHash = userEncryption.hashUserID(partner, userId)
    s"${apiConfig.url}/streaming/watch/event/index.html?userId=$userHash&partnerId=${apiConfig.partnerId}&eventId=$providerEventId&rmg=true"
  }
}
