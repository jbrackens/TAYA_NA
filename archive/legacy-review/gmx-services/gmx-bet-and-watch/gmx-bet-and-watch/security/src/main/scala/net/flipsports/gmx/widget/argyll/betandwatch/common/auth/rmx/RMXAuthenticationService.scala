package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException
import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx.dict.RMXCompanyDict
import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.{IAuthenticationService, InvalidTokenException, UserDetails}
import play.api.libs.json._
import sttp.client._
import sttp.model.MediaType

import scala.concurrent.{ExecutionContext, Future}

class RMXAuthenticationService(config: RMXConfig, oidcClient: OIDCClient, httpBackend: SttpBackend[Identity, Nothing, NothingT])
                              (implicit ec: ExecutionContext)
  extends IAuthenticationService with LazyLogging {

  implicit val hb = httpBackend

  private val companyDict = new RMXCompanyDict(config)

  override def getUserInfo(token: String): Future[UserDetails] = {
    logger.debug("Authenticating SBTech user in RMX")
    val body = s"""{"token": "$token"}"""

    oidcClient.acquireTechUserToken()
      .map(techAuth => {
        val request = basicRequest.post(uri"${config.rmxUrl}/pc/token_exchange/for_user_info/sb_tech")
          .contentType(MediaType.ApplicationJson)
          .body(body)
          .auth.bearer(techAuth)

        val response = request.send()
        (response.body, response.code.code) match {
          case (Right(s), _) => parseResult(s)
          case (Left(v), 400) => throw new InvalidTokenException(v)
          case (Left(v), _) => throw new ExternalCallException(s"Status code ${response.code}: $v")
        }
      })
  }

  private def parseResult(response: String) = {
    logger.debug(response)
    val responseJSON = Json.parse(response)
    logger.debug("Authenticating SBTech user in RMX - DONE")

    val userInfo = responseJSON.as[ExchangeTokenUserInfo]
    UserDetails(userInfo.user_sub,
      userInfo.external_user_id,
      userInfo.first_name,
      companyDict.lookupCompanyName(userInfo.company_id))
  }
}