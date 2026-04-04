package net.flipsports.gmx.game.argyll.racingroulette.webgateway

import apiV1.{Routes => RoutesV1}
import com.lightbend.lagom.scaladsl.api.{LagomConfigComponent, ServiceAcl, ServiceInfo}
import com.lightbend.lagom.scaladsl.client.{ConfigurationServiceLocatorComponents, LagomServiceClientComponents}
import com.lightbend.lagom.scaladsl.devmode.LagomDevModeComponents
import com.softwaremill.macwire._
import com.typesafe.config.ConfigFactory
import controllers.AssetsComponents
import net.flipsports.gmx.common.internal.scala.play.filter.AccessLoggingFilter
import ops.{Routes => RoutesOps}
import play.api.ApplicationLoader.Context
import play.api._
import play.api.libs.ws.ahc.AhcWSComponents
import play.api.mvc.{BodyParsers, EssentialFilter}
import play.filters.HttpFiltersComponents
import play.filters.cors.{CORSConfig, CORSFilter}
import play.filters.hosts.{AllowedHostsConfig, AllowedHostsFilter}
import router.{Routes => RoutesMain}

import scala.collection.immutable
import scala.concurrent.ExecutionContext

abstract class WebGateway(context: Context) extends BuiltInComponentsFromContext(context)
  with AssetsComponents
  with HttpFiltersComponents
  with AhcWSComponents
  with LagomConfigComponent
  with LagomServiceClientComponents

  with DataModule
  with RouletteModule
  with EventModule
  with UserModule
  with ControllerModule {

  override implicit lazy val executionContext: ExecutionContext = actorSystem.dispatcher

  override lazy val serviceInfo: ServiceInfo = ServiceInfo(
    "webgateway", Map("webgateway" -> immutable.Seq(
      ServiceAcl.forPathRegex("/info/.*"),
      ServiceAcl.forPathRegex("/api/v.*"),
      ServiceAcl.forPathRegex("/ops/.*")
    ))
  )

  val prefix = "/"
  val routesV1: RoutesV1 = wire[RoutesV1]
  val routesOps: RoutesOps = wire[RoutesOps]
  override lazy val router = wire[RoutesMain]

  override def httpFilters: Seq[EssentialFilter] = {
    val accessLogFilter = new AccessLoggingFilter()

    val corsFilter = CORSFilter(
      corsConfig = CORSConfig().withAnyOriginAllowed,
    )

    val allowedHostsFilter = AllowedHostsFilter(AllowedHostsConfig.fromConfiguration(Configuration(ConfigFactory.load())), httpErrorHandler)

    Seq(
      accessLogFilter,
      corsFilter,
      allowedHostsFilter
    )
  }

  lazy val bodyParser = new BodyParsers.Default(playBodyParsers)
}

class WebGatewayLoader extends ApplicationLoader {
  override def load(context: Context) = context.environment.mode match {
    case Mode.Dev =>
      loadCustomLoggerConfiguration(context.environment)
      (new WebGateway(context) with LagomDevModeComponents).application
    case _ =>
      (new WebGateway(context) with ConfigurationServiceLocatorComponents).application
  }

  private def loadCustomLoggerConfiguration(environment: Environment) = {
    LoggerConfigurator(environment.classLoader).foreach {
      _.configure(environment)
    }
  }
}
