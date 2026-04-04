package tech.argyll.gmx.predictorgame.services.auth

import javax.inject.{Inject, Singleton}
import tech.argyll.gmx.predictorgame.security.auth.{IAuthenticationService, UserDetails}

import scala.concurrent.{ExecutionContext, Future}

@Singleton
class DevAuthenticationService @Inject()()(implicit ec: ExecutionContext)
  extends IAuthenticationService {

  override def getUserInfo(token: String): Future[UserDetails] = {
    Future {
      UserDetails(token, "12691102", "Dev Test User", "SN")
      //      UserDetails(token, "16825817", "Dev Test User", "RZ")
    }
  }
}