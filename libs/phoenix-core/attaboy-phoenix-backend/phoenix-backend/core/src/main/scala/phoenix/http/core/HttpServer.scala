package phoenix.http.core

import scala.concurrent.ExecutionContext
import scala.concurrent.duration.DurationInt
import scala.util.Failure
import scala.util.Success

import akka.Done
import akka.actor.CoordinatedShutdown
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.http.scaladsl.Http
import akka.http.scaladsl.server.Route
import akka.{actor => classic}
import org.slf4j.LoggerFactory

object HttpServer {

  private val log = LoggerFactory.getLogger(getClass)

  def start(name: String, routes: Route, port: Int, system: ActorSystem[_]): Unit = {

    // Akka-http is not yet typed, so we have to do some slight trickery to make it work with akka-typed.
    implicit val ex: ExecutionContext = system.executionContext
    implicit val classicSystem: classic.ActorSystem = system.toClassic
    val shutdown = CoordinatedShutdown(classicSystem)

    Http().newServerAt("0.0.0.0", port).bind(routes).onComplete {
      case Success(binding) =>
        val address = binding.localAddress
        val uri = s"http://${address.getHostString}:${address.getPort}"

        log.info(s"$name online at $uri")

        shutdown.addTask(CoordinatedShutdown.PhaseServiceRequestsDone, "http-graceful-terminate") { () =>
          binding.terminate(10.seconds).map { _ =>
            log.info(s"$name at $uri graceful shutdown completed")
            Done
          }
        }
      case Failure(ex) =>
        log.error("Failed to bind HTTP endpoint, terminating system", ex)
        system.terminate()
    }
  }
}
