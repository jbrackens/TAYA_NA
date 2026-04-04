package net.flipsports.gmx.widget.argyll.betandwatch.events

import com.lightbend.lagom.scaladsl.client.ConfigurationServiceLocatorComponents
import com.lightbend.lagom.scaladsl.devmode.LagomDevModeComponents
import com.lightbend.lagom.scaladsl.server._
import com.softwaremill.macwire._
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.play.app.ApplicationLoggerHelper
import net.flipsports.gmx.widget.argyll.betandwatch.events.api.VideoService
import net.flipsports.gmx.widget.argyll.betandwatch.events.module._
import net.flipsports.gmx.widget.argyll.betandwatch.events.service.ScheduledService
import play.api.Environment
import play.api.libs.ws.ahc.AhcWSComponents

abstract class Application(context: LagomApplicationContext) extends LagomApplication(context)
  with AhcWSComponents
  with LazyLogging
  with BaseModule {

  implicit val implicitEnvironment: Environment = environment

  //SBTech Modules REQUIRED
  val sbtechModule = new SBTechIntegrationModule()(executionContext, config, backend, timeService)
  val betModule = new BetModule()(executionContext, config, backend, timeService, sbtechModule)
  val userModule = new UserModule()(executionContext, config, backend, timeService, sbtechModule)

  // StreamingProviders OPTIONAL
  val streamingProviderModules = new StreamingProviderModuleLoader
  streamingProviderModules.add(ATRIntegrationModule.load(executionContext, config, backend, timeService, userEncryption))
  streamingProviderModules.add(RMGIntegrationModule.load(executionContext, config, backend, timeService, userEncryption))
  streamingProviderModules.add(SISIntegrationModule.load(executionContext, config, backend, timeService, userEncryption))

  //Core Logic, Scheduler, API
  val eventModule = new EventModule()(executionContext, config, backend, timeService, sbtechModule,
    streamingProviderModules.allProviderLookup, streamingProviderModules.allProviderStreaming)

  var scheduledAll: Set[ScheduledService] = wireSet[ScheduledService]
  scheduledAll ++= streamingProviderModules.allProviderCache
  lazy val scheduler = new ApplicationScheduler(scheduledAll)(actorSystem)
  scheduler.start()

  override lazy val lagomServer = serverFor[VideoService](wire[VideoServiceImpl])
}

class Loader extends LagomApplicationLoader with ApplicationLoggerHelper {
  override def load(context: LagomApplicationContext): LagomApplication =
    new Application(context) with ConfigurationServiceLocatorComponents

  override def loadDevMode(context: LagomApplicationContext): LagomApplication = {
    loadCustomLoggerConfiguration(context.playContext.environment)
    new Application(context) with LagomDevModeComponents
  }

  override def describeService = Some(readDescriptor[VideoService])
}
