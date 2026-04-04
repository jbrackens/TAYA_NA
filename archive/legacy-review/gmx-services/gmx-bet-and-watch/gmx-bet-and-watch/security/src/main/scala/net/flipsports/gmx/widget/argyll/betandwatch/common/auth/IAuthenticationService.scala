package net.flipsports.gmx.widget.argyll.betandwatch.common.auth

import net.flipsports.gmx.common.internal.scala.core.exception.ExternalCallException

import scala.concurrent.Future

trait IAuthenticationService {

  @throws(classOf[ExternalCallException])
  @throws(classOf[InvalidTokenException])
  def getUserInfo(token: String): Future[UserDetails]

}
