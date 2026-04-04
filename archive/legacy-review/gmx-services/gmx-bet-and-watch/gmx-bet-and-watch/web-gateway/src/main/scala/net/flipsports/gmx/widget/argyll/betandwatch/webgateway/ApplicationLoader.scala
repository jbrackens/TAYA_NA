package net.flipsports.gmx.widget.argyll.betandwatch.webgateway


import apiV1.{Routes => RoutesV1}
import com.lightbend.lagom.scaladsl.api.{LagomConfigComponent, ServiceAcl, ServiceInfo}
import com.lightbend.lagom.scaladsl.client.{ConfigurationServiceLocatorComponents, LagomServiceClientComponents}
import com.lightbend.lagom.scaladsl.devmode.LagomDevModeComponents
import com.softwaremill.macwire._
import controllers.AssetsComponents
import net.flipsports.gmx.common.internal.scala.play.app.ApplicationLoggerHelper
import net.flipsports.gmx.common.internal.scala.play.filter.AccessLoggingFilter
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth.{AuthenticatedAction, ProdAuthenticationModule}
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.events.VideoServiceRouter
import net.flipsports.gmx.widget.argyll.betandwatch.webgateway.module.{DevRoutingModule, ProdRoutingModule}
import play.api.ApplicationLoader.Context
import play.api._
import play.api.http.HttpErrorHandler
import play.api.libs.ws.ahc.AhcWSComponents
import play.api.mvc.{BodyParsers, EssentialFilter}
import play.filters.HttpFiltersComponents
import play.filters.cors.{CORSConfig, CORSFilter}
import play.filters.csrf.CSRFFilter
import play.filters.headers.SecurityHeadersFilter
import play.filters.hosts.AllowedHostsFilter
import router.{Routes => RoutesMain}
import sttp.client.HttpURLConnectionBackend

import scala.collection.immutable
import scala.concurrent.ExecutionContext

abstract class Application(context: Context) extends BuiltInComponentsFromContext(context)
  with AssetsComponents
  with HttpFiltersComponents
  with AhcWSComponents
  with LagomConfigComponent
  with LagomServiceClientComponents {

  override implicit lazy val executionContext: ExecutionContext = actorSystem.dispatcher

  override lazy val serviceInfo: ServiceInfo = ServiceInfo(
    "webgateway", Map("webgateway" -> immutable.Seq(
      ServiceAcl.forPathRegex("/info/.*"),
      ServiceAcl.forPathRegex("/api/v.*"),
    ))
  )

  lazy val prefix = "/"
  lazy val v1: RoutesV1 = wire[RoutesV1]
  override lazy val router = wire[RoutesMain]

  override lazy val httpErrorHandler: HttpErrorHandler = new BusinessErrorHandler(environment, configuration, new OptionalSourceMapper(sourceMapper), () => router)

  val accessLogFilter = new AccessLoggingFilter()
  val errorSimulatorFilter = new ErrorSimulatorFilter()
  val corsFilter = CORSFilter(
    corsConfig = CORSConfig().withAnyOriginAllowed,
    errorHandler = httpErrorHandler
  )

  override def httpFilters: Seq[EssentialFilter] = {
    val filters = super.httpFilters
      .filterNot(_.getClass == classOf[SecurityHeadersFilter])
      .filterNot(_.getClass == classOf[AllowedHostsFilter])
      .filterNot(_.getClass == classOf[CSRFFilter])
    filters ++ Seq(
      accessLogFilter,
      errorSimulatorFilter,
      corsFilter
    )
  }

  // implicits
  implicit val backend = HttpURLConnectionBackend()

  // modules
  val authModule = new ProdAuthenticationModule()(executionContext, config, backend)
  //  val devAuth = new DevAuthenticationService()

  // "beans"
  lazy val gatewayController = wire[GatewayController]
  lazy val buildInfoController = wire[BuildInfoController]
  lazy val authAction = wire[AuthenticatedAction]

  lazy val bodyParser = new BodyParsers.Default(playBodyParsers)

  def serviceRouter: VideoServiceRouter
}

class Loader extends ApplicationLoader with ApplicationLoggerHelper {
  override def load(context: Context) = context.environment.mode match {
    case Mode.Dev =>
      loadCustomLoggerConfiguration(context.environment)
      (new Application(context) with LagomDevModeComponents with DevRoutingModule).application
    case _ =>
      (new Application(context) with ConfigurationServiceLocatorComponents with ProdRoutingModule).application
  }
}
