package stella.achievement.routes

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import sttp.tapir.server.interceptor.decodefailure.DecodeFailureInterceptor
import sttp.tapir.server.play.PlayServerOptions

import stella.common.http.JsonWrapperDecodeFailureHandler

import stella.achievement.routes.ResponseFormats.errorOutputFormats._
import stella.achievement.routes.ResponseFormats.errorOutputSchemas._

object StellaPlayServerOptions {
  def instance(ec: ExecutionContext, materializer: Materializer): PlayServerOptions =
    PlayServerOptions
      .default(materializer, ec)
      .prependInterceptor(new DecodeFailureInterceptor(new JsonWrapperDecodeFailureHandler))
}
