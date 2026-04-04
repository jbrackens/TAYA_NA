package stella.common.http.jwt

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import cats.syntax.either._
import com.github.blemale.scaffeine.AsyncLoadingCache
import com.github.blemale.scaffeine.Scaffeine
import org.jose4j.jwk.JsonWebKey
import org.jose4j.jwk.JsonWebKeySet
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import spray.json.DefaultJsonProtocol._
import spray.json._
import sttp.client3._
import sttp.client3.sprayJson._

import stella.common.http.jwt.config.JwtConfig

/** This service loads properties from OIDC discovery service and JWKS store and caches them for specified time */
class OidcDiscovery(config: JwtConfig, requestSender: SttpRequestSender = SttpRequestSenderImpl)(implicit
    ec: ExecutionContext)
    extends OidcPropertiesProvider {
  import OidcDiscovery._
  private val singleValueCacheSize = 1

  private val issuerCache: AsyncLoadingCache[String, String] =
    Scaffeine()
      .expireAfterWrite(config.issuerCacheRefreshFrequency)
      .maximumSize(singleValueCacheSize)
      .buildAsyncFuture(realm => loadIssuer(realm))

  private val jwksCache: AsyncLoadingCache[String, Iterable[JsonWebKey]] =
    Scaffeine()
      .expireAfterWrite(config.jwksCacheRefreshFrequency)
      .maximumSize(singleValueCacheSize)
      .buildAsyncFuture(realm => loadJwks(realm))

  override def getIssuer(realm: String): Future[String] = issuerCache.get(realm)

  override def getJsonWebKey(
      realm: String,
      keyId: String,
      expectedUse: String,
      expectedAlgorithm: String): Future[Option[JsonWebKey]] =
    jwksCache
      .get(realm)
      .map(jsonWebKeys =>
        jsonWebKeys.find(key =>
          key.getKeyId == keyId && key.getUse == expectedUse && key.getAlgorithm == expectedAlgorithm))

  private def loadIssuer(realm: String): Future[String] = Future {
    val backend = HttpURLConnectionBackend()
    try {
      for {
        oidcConfig <- fetchOidcConfig(realm, backend)
        issuer <- getStringFieldValue(oidcConfig, issuerFieldName).leftMap(OidcPropertyLookupError(_))
      } yield {
        log.info(s"Issuer cache refreshed. $issuerFieldName read from service discovery endpoint: $issuer")
        issuer
      }
    } finally {
      backend.close()
    }
  }.flatMap {
    case Right(issuer) => Future.successful(issuer)
    case Left(error)   => Future.failed(error)
  }

  private def loadJwks(realm: String): Future[Iterable[JsonWebKey]] = Future {
    val backend = HttpURLConnectionBackend()
    try {
      for {
        oidcConfig <- fetchOidcConfig(realm, backend)
        jwksUri <- getStringFieldValue(oidcConfig, jwksUriFieldName).leftMap(OidcPropertyLookupError(_))
        _ = log.info(s"$jwksUriFieldName read from service discovery endpoint: $jwksUri")
        keys <- fetchJwks(jwksUri, backend)
      } yield {
        log.info("JWKS cache refreshed")
        keys
      }
    } finally {
      backend.close()
    }
  }.flatMap {
    case Right(keys) => Future.successful(keys)
    case Left(error) => Future.failed(error)
  }

  private def fetchOidcConfig(realm: String, backend: SttpBackend[Identity, Any]): Either[Exception, JsObject] = {
    val configurationEndpointUri =
      s"${config.internalServiceDiscoveryEndpointUri}/$realm/.well-known/openid-configuration"
    log.info(s"Fetching config from service discovery endpoint $configurationEndpointUri")
    val oidcDiscoveryResponse = fetchJsObjectSync(configurationEndpointUri, backend)
    for {
      _ <- verifyResponseStatus(oidcDiscoveryResponse).leftMap(OidcPropertyLookupError(_))
      oidcConfig <- oidcDiscoveryResponse.body.leftMap(e =>
        OidcPropertyLookupError(s"Fetching config from service discovery endpoint $configurationEndpointUri failed", e))
    } yield {
      log.trace(s"Config fetched from service discovery endpoint: $oidcConfig")
      oidcConfig
    }
  }

  private def fetchJwks(
      jwksUri: String,
      backend: SttpBackend[Identity, Any]): Either[Exception, Iterable[JsonWebKey]] = {
    log.info(s"Fetching JWKS from $jwksUri")
    val request = basicRequest.get(uri"$jwksUri")
    val jwksResponse = requestSender.send(request, backend)
    for {
      _ <- verifyResponseStatus(jwksResponse).leftMap(OidcPropertyLookupError(_))
      jwksContent <- jwksResponse.body.leftMap(errorMsg =>
        OidcPropertyLookupError(s"JWKS call to $jwksUri failed with: $errorMsg"))
      jwks <- Either
        .catchNonFatal(new JsonWebKeySet(jwksContent))
        .leftMap(e => OidcPropertyLookupError(s"Couldn't load JWKS from received response $jwksContent", e))
    } yield {
      val keys = jwks.getJsonWebKeys.asScala
      log.trace(s"JSON Web Keys fetched from JWKS: $keys")
      keys
    }
  }

  private def fetchJsObjectSync(
      uri: String,
      backend: SttpBackend[Identity, Any]): Response[Either[ResponseException[String, Exception], JsObject]] = {
    val request = basicRequest.get(uri"$uri").response(asJson[JsObject])
    requestSender.send(request, backend)
  }

  private def verifyResponseStatus(response: Response[_]): Either[String, Unit] =
    if (response.is200) ().asRight
    else s"Couldn't get data from ${response.request.uri}. Response status code: ${response.code}".asLeft

  private def getStringFieldValue(oidcConfig: JsObject, fieldName: String): Either[String, String] =
    oidcConfig.fields.get(fieldName) match {
      case Some(JsString(value)) =>
        value.asRight
      case None =>
        s"Error when processing fetched config. $fieldName not found in $oidcConfig".asLeft
      case _ =>
        s"Error when processing fetched config. $fieldName in $oidcConfig is not String".asLeft
    }
}

object OidcDiscovery {
  private val log: Logger = LoggerFactory.getLogger(getClass)
  private val issuerFieldName = "issuer"
  private val jwksUriFieldName = "jwks_uri"
}
