package tech.argyll.gmx.predictorgame.modules

import com.google.inject.AbstractModule
import tech.argyll.gmx.predictorgame.security.auth.IAuthenticationService
import tech.argyll.gmx.predictorgame.services.auth.DevAuthenticationService

class DevAuthModule extends AbstractModule {

  override def configure() = {
    bind(classOf[IAuthenticationService]).to(classOf[DevAuthenticationService])
  }

}
