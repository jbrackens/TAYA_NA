package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth

import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.{IAuthenticationService, UserDetails}

import scala.concurrent.{ExecutionContext, Future}

class DevAuthenticationService()(implicit ec: ExecutionContext)
  extends IAuthenticationService {

  override def getUserInfo(token: String): Future[UserDetails] = {
    Future {
      UserDetails(token, "12691102", "Dev Test User", "SN")
      // UserDetails(token, "16825817", "Dev Test User", "RZ")
    }
  }
}