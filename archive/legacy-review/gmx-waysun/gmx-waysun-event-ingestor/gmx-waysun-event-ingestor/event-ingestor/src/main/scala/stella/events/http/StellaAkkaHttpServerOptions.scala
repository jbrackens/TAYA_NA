package stella.events.http

import sttp.tapir.server.akkahttp.AkkaHttpServerOptions
import sttp.tapir.server.interceptor.decodefailure.DecodeFailureInterceptor

import stella.common.http.JsonWrapperDecodeFailureHandler

import stella.events.http.routes.ResponseFormats.errorOutputFormats._
import stella.events.http.routes.ResponseFormats.errorOutputSchemas._

object StellaAkkaHttpServerOptions {
  val instance: AkkaHttpServerOptions =
    AkkaHttpServerOptions.default.prependInterceptor(new DecodeFailureInterceptor(new JsonWrapperDecodeFailureHandler))
}
