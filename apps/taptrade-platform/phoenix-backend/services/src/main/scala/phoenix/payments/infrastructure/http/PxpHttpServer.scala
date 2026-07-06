package phoenix.payments.infrastructure.http

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.server.Route
import org.slf4j.LoggerFactory

import phoenix.http.core.HttpLogging._
import phoenix.http.core.HttpServer

final class PxpHttpServer(routes: Route, port: Int, system: ActorSystem[_]) {
  private val log = LoggerFactory.getLogger(getClass)

  def start(): Unit = {
    log.info("PXP HTTP routes starting...")
    HttpServer.start(classOf[PxpHttpServer].getSimpleName, routes, port, system)
  }
}

object PxpHttpServer {
  def create(routes: PxpRoutes, port: Int)(implicit system: ActorSystem[_]): PxpHttpServer =
    new PxpHttpServer(withLogging(routes.toAkkaHttp), port, system)
}
