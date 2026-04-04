package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx

import java.util.concurrent.TimeUnit

import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.common.internal.scala.cache.LoadingCache2kCache
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import org.cache2k.Cache2kBuilder
import org.cache2k.integration.CacheLoader
import play.api.libs.json.{Format, JsValue, Json}
import scalacache.Cache
import scalacache.modes.sync._
import sttp.client._

class OIDCDiscovery(rmxConfig: RMXConfig, config: Config, httpBackend: SttpBackend[Identity, Nothing, NothingT])
  extends SttpCallOps with LazyLogging {

  private val configResponse = "config_response"
  private val jwksResponse = "jwks_response"

  implicit val jwkConverter: Format[JSONWebKey] = Json.format[JSONWebKey]

  implicit val hb = httpBackend

  private val configCacheExpire = config.getDuration("app.auth.cache.config.duration")
  private val configCacheResilience = config.getDuration("app.auth.cache.config.resilience")
  private val configCache2k = new Cache2kBuilder[String, JsValue]() {}
    .entryCapacity(1)
    .sharpExpiry(true)
    .expireAfterWrite(configCacheExpire.toMillis, TimeUnit.MILLISECONDS)
    .resilienceDuration(configCacheResilience.toMillis, TimeUnit.MILLISECONDS)
    .loader(new ConfigLoader())
    .build
  implicit val configCache: Cache[JsValue] = new LoadingCache2kCache[JsValue](configCache2k)

  private val jwksCacheExpire = config.getDuration("app.auth.cache.jwks.duration")
  private val jwksCacheResilience = config.getDuration("app.auth.cache.jwks.resilience")
  private val jwksCache2k = new Cache2kBuilder[String, JsValue]() {}
    .entryCapacity(1)
    .sharpExpiry(true)
    .expireAfterWrite(jwksCacheExpire.toMillis, TimeUnit.MILLISECONDS)
    .resilienceDuration(jwksCacheResilience.toMillis, TimeUnit.MILLISECONDS)
    .loader(new JWKSLoader())
    .build
  implicit val jwksCache: Cache[JsValue] = new LoadingCache2kCache[JsValue](jwksCache2k)

  def getTokenEndpoint: String = {
    configCache.get(configResponse)
      .get.apply("token_endpoint").as[String]
  }

  private def getJwksUri: String = {
    configCache.get(configResponse)
      .get.apply("jwks_uri").as[String]
  }

  def getKeySet: Seq[JSONWebKey] = {
    jwksCache.get(jwksResponse)
      .get.apply("keys").as[Seq[JSONWebKey]]
  }

  class ConfigLoader extends CacheLoader[String, JsValue] {
    override def load(key: String): JsValue = {
      logger.debug("Loading OIDC config")

      val request = basicRequest.get(uri"${rmxConfig.rmxUrl}/openid/.well-known/openid-configuration")
      val response = request.send()
      val responseJSON = Json.parse(unsafeBody(response))

      logger.debug("Loading OIDC config - DONE; cache for {}", configCacheExpire)
      responseJSON
    }
  }

  class JWKSLoader extends CacheLoader[String, JsValue] {
    override def load(key: String): JsValue = {
      logger.debug("Loading JWKS")

      val uri = getJwksUri
      val request = basicRequest.get(uri"$uri")
      val response = request.send()
      val responseJSON = Json.parse(unsafeBody(response))

      logger.debug("Loading JWKS - DONE; cache for {}", jwksCacheExpire)
      responseJSON
    }
  }

}