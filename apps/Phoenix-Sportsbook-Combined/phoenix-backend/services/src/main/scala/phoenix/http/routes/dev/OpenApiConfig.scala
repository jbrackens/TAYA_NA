package phoenix.http.routes.dev

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

final case class OpenApiConfig(docsRelativeUrl: String, apiBaseUrl: String)

object OpenApiConfig {
  object of extends BaseConfig[OpenApiConfig]("phoenix.openapi")
}
