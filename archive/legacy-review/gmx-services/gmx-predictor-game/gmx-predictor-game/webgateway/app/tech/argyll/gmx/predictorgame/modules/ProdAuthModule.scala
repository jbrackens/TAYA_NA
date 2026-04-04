package tech.argyll.gmx.predictorgame.modules

import com.google.inject.{AbstractModule, Provides, Singleton}
import com.softwaremill.sttp.{Id, SttpBackend}
import com.typesafe.config.Config
import tech.argyll.gmx.predictorgame.security.auth.IAuthenticationService
import tech.argyll.gmx.predictorgame.security.auth.config._
import tech.argyll.gmx.predictorgame.security.auth.rmx._

import scala.concurrent.ExecutionContext.Implicits.global

class ProdAuthModule extends AbstractModule {

  @Provides
  @Singleton
  def provideRMXConfig(config: Config): RMXConfig = {
    RMXConfig(config)
  }

  @Provides
  @Singleton
  def provideOIDCDiscovery(rmxConfig: RMXConfig, config: Config, httpBackend: SttpBackend[Id, Nothing]): OIDCDiscovery = {
    new OIDCDiscovery(rmxConfig, JWKSCacheConfig(config), OIDCDiscoveryCacheConfig(config))(httpBackend, global)
  }

  @Provides
  @Singleton
  def provideOIDCClient(config: RMXConfig, authenticator: OIDCUserAuthenticator): OIDCClient = {
    new OIDCClient(config, authenticator)
  }

  @Provides
  @Singleton
  def provideOIDCUserAuthenticator(rmxConfig: RMXConfig, config: Config, oidcDiscovery: OIDCDiscovery, httpBackend: SttpBackend[Id, Nothing]): OIDCUserAuthenticator = {
    new OIDCUserAuthenticator(rmxConfig, TokenExpiryConfig(config), oidcDiscovery)(httpBackend, global)
  }

  @Provides
  @Singleton
  def provideIAuthenticationService(config: RMXConfig, oidcClient: OIDCClient, httpBackend: SttpBackend[Id, Nothing]): IAuthenticationService = {
    new RMXAuthenticationService(config, oidcClient)(httpBackend, global)
  }
}
