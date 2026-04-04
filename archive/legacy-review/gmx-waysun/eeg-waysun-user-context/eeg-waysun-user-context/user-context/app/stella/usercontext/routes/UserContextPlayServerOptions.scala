package stella.usercontext.routes

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import sttp.tapir.server.interceptor.decodefailure.DecodeFailureInterceptor
import sttp.tapir.server.play.PlayServerOptions

import stella.common.http.JsonWrapperDecodeFailureHandler

import stella.usercontext.routes.ResponseFormats.errorOutputFormats._
import stella.usercontext.routes.ResponseFormats.errorOutputSchemas._

object UserContextPlayServerOptions {
  def instance(ec: ExecutionContext, materializer: Materializer): PlayServerOptions =
    PlayServerOptions
      .default(materializer, ec)
      .prependInterceptor(new DecodeFailureInterceptor(new JsonWrapperDecodeFailureHandler))
}
