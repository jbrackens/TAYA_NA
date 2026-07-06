package phoenix.http.core

import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.server.Directive0
import akka.http.scaladsl.server.Route
import akka.http.scaladsl.server.RouteResult
import akka.http.scaladsl.server.RouteResult.Complete
import akka.http.scaladsl.server.directives.DebuggingDirectives
import akka.http.scaladsl.server.directives.LoggingMagnet
import net.logstash.logback.argument.StructuredArguments.keyValue
import org.slf4j.LoggerFactory

object HttpLogging {
  private val log = LoggerFactory.getLogger(getClass)

  private def logRequestResponse(request: HttpRequest)(result: RouteResult): Unit =
    result match {
      case Complete(response) =>
        log.info(
          "HTTP request: {} {} {}",
          keyValue("method", request.method.value),
          keyValue("path", request.uri.path.toString),
          keyValue("status", response.status.intValue),
          keyValue("log_type", "HttpRequest"))
      case _ => ()
    }

  private val logDirective: Directive0 = DebuggingDirectives.logRequestResult(LoggingMagnet(_ => logRequestResponse))

  def withLogging(route: Route): Route = logDirective.tapply(_ => route)
}
