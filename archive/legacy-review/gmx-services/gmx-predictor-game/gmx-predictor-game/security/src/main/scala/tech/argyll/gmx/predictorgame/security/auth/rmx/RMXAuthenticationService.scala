package tech.argyll.gmx.predictorgame.security.auth.rmx

import com.softwaremill.sttp._
import com.typesafe.scalalogging.LazyLogging
import play.api.libs.json.Json
import tech.argyll.gmx.predictorgame.common.exception.ExternalCallException
import tech.argyll.gmx.predictorgame.security.auth.config.RMXConfig
import tech.argyll.gmx.predictorgame.security.auth.rmx.RMXConverters._
import tech.argyll.gmx.predictorgame.security.auth.{IAuthenticationService, InvalidTokenException, UserDetails}

import scala.concurrent.{ExecutionContext, Future}

class RMXAuthenticationService(config: RMXConfig, oidcClient: OIDCClient)
                              (implicit httpBackend: SttpBackend[Id, Nothing], ec: ExecutionContext)
  extends IAuthenticationService with LazyLogging {

  override def getUserInfo(token: String): Future[UserDetails] = {
    logger.debug("Authenticating user in RMX")
    val body = s"""{"token": "$token"}"""

    oidcClient.acquireTechUserToken()
      .map(techAuth => {
        val request = sttp.post(uri"${config.url}/pc/token_exchange/for_user_info/sb_tech")
          .contentType(MediaTypes.Json)
          .body(body)
          .auth.bearer(techAuth)

        val response = request.send()
        (response.body, response.code) match {
          case (Right(s), _) => parseResult(s)
          case (Left(v), 400) => throw new InvalidTokenException(v)
          case (_, _) => throw new ExternalCallException(response.code.toString)
        }
      })
  }

  private def parseResult(response: String) = {
    logger.debug(response)
    val userDetails = Json.parse(response).validate[UserDetails].asEither

    userDetails match {
      case Right(details) => {
        logger.debug("Authenticating user in RMX - DONE")
        details
      }
      case Left(details) => {
        logger.error("Could not parse RMX response {}", response)
        throw new ExternalCallException(details.toString())
      }
    }
  }
}
