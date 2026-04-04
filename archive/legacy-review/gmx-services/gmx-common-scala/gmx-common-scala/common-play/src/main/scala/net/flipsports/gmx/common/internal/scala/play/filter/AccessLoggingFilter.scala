package net.flipsports.gmx.common.internal.scala.play.filter

import akka.stream.Materializer
import org.apache.commons.lang3.builder.{ ReflectionToStringBuilder, ToStringStyle }
import play.api.Logger
import play.api.mvc.{ Filter, RequestHeader, Result }

import scala.concurrent.duration._
import scala.concurrent.{ ExecutionContext, Future }

class AccessLoggingFilter(implicit val mat: Materializer, ec: ExecutionContext) extends Filter {

  val accessLogger = Logger("ACCESS")

  def apply(next: RequestHeader => Future[Result])(request: RequestHeader): Future[Result] = {
    val beginNs = System.nanoTime()

    next(request).map(result => {
      val elapsedNs = System.nanoTime() - beginNs
      val elapsedMs3 = elapsedNs.nanos
      logRequest(request, result, elapsedMs3)
      result
    })
  }

  private def logRequest(request: RequestHeader, result: Result, elapsedNs: FiniteDuration): Unit = {
    accessLogger.info(
      s"method=${request.method} uri=${request.uri} remote-address=${request.remoteAddress} status=${result.header.status} duration=${elapsedNs.toMillis}ms")
    if (accessLogger.isDebugEnabled) {
      accessLogger.debug(
        s"Full request: ${ReflectionToStringBuilder.toString(request, ToStringStyle.MULTI_LINE_STYLE)}")
      accessLogger.debug(
        s"Full response: ${ReflectionToStringBuilder.toString(result, ToStringStyle.MULTI_LINE_STYLE)}")
    }
  }
}
