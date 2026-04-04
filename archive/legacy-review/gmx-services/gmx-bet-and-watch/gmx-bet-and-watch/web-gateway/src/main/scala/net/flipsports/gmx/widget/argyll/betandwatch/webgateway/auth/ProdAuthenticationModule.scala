package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth

import com.softwaremill.macwire._
import com.typesafe.config.Config
import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx._
import sttp.client.{Identity, NothingT, SttpBackend}

import scala.concurrent.ExecutionContext

@Module
class ProdAuthenticationModule(implicit executionContext: ExecutionContext,
                               config: Config,
                               httpBackend: SttpBackend[Identity, Nothing, NothingT]) {
  lazy val rmxConfig = wire[RMXConfig]
  lazy val oidcDiscovery = wire[OIDCDiscovery]
  lazy val oidcClient = wire[OIDCClient]
  lazy val oidcUserAuthenticator = wire[OIDCUserAuthenticator]
  lazy val authenticationService = wire[RMXAuthenticationService]
}