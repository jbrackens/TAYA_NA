package stella.common.http.config

import stella.common.http.jwt.config.JwtConfig

// if needed, we can configure here keystores, mutual TLS settings etc.
final case class HttpServerConfig(host: String, port: Int, jwt: JwtConfig)
