package tech.argyll.gmx.predictorgame.common.play.filter

import akka.stream.Materializer
import javax.inject.Inject
import play.api.Logger
import play.api.mvc.{Filter, RequestHeader, Result}

import scala.concurrent.{ExecutionContext, Future}

class AccessLoggingFilter @Inject()(implicit val mat: Materializer, ec: ExecutionContext) extends Filter {

  val accessLogger = Logger("access")

  def apply(next: RequestHeader => Future[Result])(request: RequestHeader): Future[Result] = {
    next(request)
      .map(result => {
        logRequest(request, result)
        result
      })
  }

  private def logRequest(request: RequestHeader, result: Result): Unit = {
    accessLogger.info(s"method=${request.method} uri=${request.uri} remote-address=${request.remoteAddress} status=${result.header.status}")
  }
}
