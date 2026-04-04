package net.flipsports.gmx.widget.argyll.betandwatch.events.module

import com.softwaremill.macwire.{Module, wire}
import com.typesafe.config.Config
import net.flipsports.gmx.common.internal.scala.core.time.TimeService
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.user.UsersService
import sttp.client.{NothingT, SttpBackend}

import scala.concurrent.{ExecutionContext, Future}

@Module
class UserModule(implicit executionContext: ExecutionContext,
                 config: Config,
                 httpBackend: SttpBackend[Future, Nothing, NothingT],
                 timeService: TimeService,
                 sbtechIntegrationModule: SBTechIntegrationModule) {

  lazy val usersService = wire[UsersService]

}
