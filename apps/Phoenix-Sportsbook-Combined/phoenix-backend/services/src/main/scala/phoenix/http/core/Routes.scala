package phoenix.http.core

import scala.concurrent.Future

import akka.http.scaladsl.server.Route
import sttp.capabilities.WebSockets
import sttp.capabilities.akka.AkkaStreams
import sttp.tapir.server.ServerEndpoint
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter

import phoenix.http.core.Routes.Endpoints

trait Routes {

  val akkaInterpreter: AkkaHttpServerInterpreter = AkkaHttpServerInterpreter(CustomServerOptions.instance)

  def toRoute(ses: Endpoints): Route = akkaInterpreter.toRoute(ses)

  def endpoints: Endpoints

  def toAkkaHttp: Route = toRoute(endpoints)

  def swaggerDefinition: SwaggerDefinition = SwaggerDefinition(endpoints.map(_.endpoint))

}

object Routes {
  type Endpoints = List[ServerEndpoint[AkkaStreams with WebSockets, Future]]
}
