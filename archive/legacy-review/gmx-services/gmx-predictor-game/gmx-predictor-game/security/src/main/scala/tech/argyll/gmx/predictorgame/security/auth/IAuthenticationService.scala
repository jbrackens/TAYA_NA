package tech.argyll.gmx.predictorgame.security.auth

import tech.argyll.gmx.predictorgame.common.exception.ExternalCallException

import scala.concurrent.Future

trait IAuthenticationService {

  @throws(classOf[ExternalCallException])
  @throws(classOf[InvalidTokenException])
  def getUserInfo(token: String): Future[UserDetails]

}
