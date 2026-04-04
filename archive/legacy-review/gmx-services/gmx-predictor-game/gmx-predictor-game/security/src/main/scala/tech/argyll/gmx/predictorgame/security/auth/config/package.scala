package tech.argyll.gmx.predictorgame.security.auth

import com.typesafe.config.Config
import pureconfig.generic.ProductHint
import pureconfig.generic.semiauto.deriveReader
import pureconfig.{CamelCase, ConfigFieldMapping, ConfigReader, SnakeCase}

import scala.concurrent.duration.FiniteDuration

package object config {
  protected implicit def hint[T] = ProductHint[T](ConfigFieldMapping(CamelCase, SnakeCase))

  private implicit val TokenExpiryConfigReader: ConfigReader[TokenExpiryConfig] = deriveReader[TokenExpiryConfig]

  case class TokenExpiryConfig(offset: FiniteDuration, clockSkew: FiniteDuration)

  object TokenExpiryConfig {
    def apply(config: Config, path: String = "app.auth.token.expiry"): TokenExpiryConfig = {
      pureconfig.loadConfigOrThrow[TokenExpiryConfig](config.getConfig(path))
    }
  }


  private implicit val CacheConfigReader: ConfigReader[CacheConfig] = deriveReader[CacheConfig]

  case class CacheConfig(expire: FiniteDuration, resilience: FiniteDuration)

  object OIDCDiscoveryCacheConfig {
    def apply(config: Config, path: String = "app.auth.oidc-discovery.cache"): CacheConfig = {
      pureconfig.loadConfigOrThrow[CacheConfig](config.getConfig(path))
    }
  }

  object JWKSCacheConfig {
    def apply(config: Config, path: String = "app.auth.jwks.cache"): CacheConfig = {
      pureconfig.loadConfigOrThrow[CacheConfig](config.getConfig(path))
    }
  }


  private implicit val RMXConfigReader: ConfigReader[RMXConfig] = deriveReader[RMXConfig]

  case class RMXConfig(url: String, clientId: String, clientPassword: String, userName: String, userPassword: String)

  object RMXConfig {
    def apply(config: Config, path: String = "app.auth.rmx"): RMXConfig = {
      pureconfig.loadConfigOrThrow[RMXConfig](config.getConfig(path))
    }
  }

}
