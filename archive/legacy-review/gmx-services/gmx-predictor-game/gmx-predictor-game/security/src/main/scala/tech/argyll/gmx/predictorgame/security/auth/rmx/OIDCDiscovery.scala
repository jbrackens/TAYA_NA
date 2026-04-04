package tech.argyll.gmx.predictorgame.security.auth.rmx

import java.util.concurrent.TimeUnit

import com.softwaremill.sttp.{SttpBackend, _}
import com.typesafe.scalalogging.LazyLogging
import org.cache2k.Cache2kBuilder
import org.cache2k.integration.CacheLoader
import play.api.libs.json.{Format, JsValue, Json}
import scalacache.Cache
import scalacache.modes.sync._
import tech.argyll.gmx.predictorgame.common.cache.LoadingCache2kCache
import tech.argyll.gmx.predictorgame.security.auth.config._
import tech.argyll.gmx.predictorgame.security.auth.jwt.JSONWebKey

import scala.concurrent.ExecutionContext
import scala.language.higherKinds

class OIDCDiscovery(rmxConfig: RMXConfig, jwksConfig: CacheConfig, oidcConfig: CacheConfig)
                   (implicit httpBackend: SttpBackend[Id, Nothing], ec: ExecutionContext)
  extends LazyLogging {

  implicit val jwkConverter: Format[JSONWebKey] = Json.format[JSONWebKey]

  private val configCache2k = new Cache2kBuilder[String, JsValue]() {}
    .entryCapacity(1)
    .sharpExpiry(true)
    .expireAfterWrite(oidcConfig.expire.toMillis, TimeUnit.MILLISECONDS)
    .resilienceDuration(oidcConfig.resilience.toMillis, TimeUnit.MILLISECONDS)
    .loader(new ConfigLoader())
    .build
  implicit val configCache: Cache[JsValue] = new LoadingCache2kCache[JsValue](configCache2k)

  private val jwksCache2k = new Cache2kBuilder[String, JsValue]() {}
    .entryCapacity(1)
    .sharpExpiry(true)
    .expireAfterWrite(jwksConfig.expire.toMillis, TimeUnit.MILLISECONDS)
    .resilienceDuration(jwksConfig.resilience.toMillis, TimeUnit.MILLISECONDS)
    .loader(new JWKSLoader())
    .build
  implicit val jwksCache: Cache[JsValue] = new LoadingCache2kCache[JsValue](jwksCache2k)

  def getTokenEndpoint: String = {
    configCache.get("config_response")
      .get.apply("token_endpoint").as[String]
  }

  private def getJwksUri: String = {
    configCache.get("config_response")
      .get.apply("jwks_uri").as[String]
  }

  def getKeySet: Seq[JSONWebKey] = {
    jwksCache.get("jwks_response")
      .get.apply("keys").as[Seq[JSONWebKey]]
  }

  class ConfigLoader extends CacheLoader[String, JsValue] {
    override def load(key: String): JsValue = {
      logger.debug("Loading OIDC config")

      val request = sttp.get(uri"${rmxConfig.url}/openid/.well-known/openid-configuration")
      val response = request.send()
      val responseJSON = Json.parse(response.unsafeBody)

      logger.debug(s"Loading OIDC config - DONE; cache for ${oidcConfig.expire}")
      responseJSON
    }
  }

  class JWKSLoader extends CacheLoader[String, JsValue] {
    override def load(key: String): JsValue = {
      logger.debug("Loading JWKS")

      val uri = getJwksUri
      val request = sttp.get(uri"$uri")
      val response = request.send()
      val responseJSON = Json.parse(response.unsafeBody)

      logger.debug(s"Loading JWKS - DONE; cache for ${jwksConfig.expire}")
      responseJSON
    }
  }

}