package stella.events.http

import scala.concurrent.Future

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import org.slf4j.Logger
import org.slf4j.LoggerFactory

import stella.common.http.config.HttpServerConfig

object HttpServer {
  private val log: Logger = LoggerFactory.getLogger(getClass)

  def start(serverName: String, config: HttpServerConfig, routes: Route)(implicit
      system: ActorSystem[_]): Future[Http.ServerBinding] = {

    val serverBinding = Http().newServerAt(config.host, config.port).bind(routes)
    log.info(s"$serverName started on ${config.host}:${config.port}")
    serverBinding
  }
}
