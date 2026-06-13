package stella.wallet.routes

import scala.concurrent.ExecutionContext

import akka.stream.Materializer
import sttp.tapir.server.interceptor.decodefailure.DecodeFailureInterceptor
import sttp.tapir.server.play.PlayServerOptions

import stella.common.http.JsonWrapperDecodeFailureHandler

import stella.wallet.routes.ResponseFormats.errorOutputFormats._
import stella.wallet.routes.ResponseFormats.errorOutputSchemas._

object WalletPlayServerOptions {
  def instance(ec: ExecutionContext, materializer: Materializer): PlayServerOptions =
    PlayServerOptions
      .default(materializer, ec)
      .prependInterceptor(new DecodeFailureInterceptor(new JsonWrapperDecodeFailureHandler))
}
