package net.flipsports.gmx.widget.argyll.betandwatch.common.auth.rmx

import java.math.BigInteger
import java.security.spec.RSAPublicKeySpec
import java.security.{Key, KeyFactory}

import com.typesafe.config.Config
import com.typesafe.scalalogging.LazyLogging
import io.jsonwebtoken.impl.DefaultJwtParser
import io.jsonwebtoken.{Claims, JwtParser}
import net.flipsports.gmx.common.internal.scala.http.SttpCallOps
import net.flipsports.gmx.widget.argyll.betandwatch.common.jwt.SigningKeyByIdResolver
import org.apache.commons.codec.binary.Base64
import play.api.libs.json.Json
import sttp.client._
import sttp.model.MediaType

class OIDCUserAuthenticator(rmxConfig: RMXConfig, config: Config, oidcDiscovery: OIDCDiscovery, httpBackend: SttpBackend[Identity, Nothing, NothingT])
  extends SttpCallOps with LazyLogging {

  implicit val hb = httpBackend

  private val jwtParser: JwtParser = new DefaultJwtParser()
    .setAllowedClockSkewSeconds(config.getDuration("app.auth.token.expiry.clock_skew").getSeconds)
    .setSigningKeyResolver(new OIDCSigningKeyResolver(rmxConfig, oidcDiscovery))

  def authenticateUser(username: String, password: String): OIDCToken = {
    val token = authenticate(username, password)
    val expires = extractExpires(token)

    OIDCToken(token, expires, config.getDuration("app.auth.token.expiry.offset").getSeconds)
  }

  private def authenticate(username: String, password: String) = {
    logger.debug("Authenticating '{}' user in RMX", username)

    val authUrl = oidcDiscovery.getTokenEndpoint
    val request = basicRequest.post(uri"$authUrl")
      .contentType(MediaType.ApplicationXWwwFormUrlencoded)
      .body(Map("grant_type" -> "password",
        "username" -> username,
        "password" -> password,
        "client_id" -> rmxConfig.rmxClient,
        "client_secret" -> rmxConfig.rmxClientPass))

    val response = request.send()
    val responseJSON = Json.parse(unsafeBody(response))

    logger.debug("Authenticating '{}' user in RMX - DONE", username)
    responseJSON("id_token").as[String]
  }

  private def extractExpires(token: String): Long = {
    val jwt = jwtParser.parse(token)
    val exp = jwt.getBody.asInstanceOf[Claims].get("exp")
    Integer2int(exp.asInstanceOf[Integer])
  }

  class OIDCSigningKeyResolver(config: RMXConfig, oidcDiscovery: OIDCDiscovery) extends SigningKeyByIdResolver {
    val supportedAlg = "RSA"

    override def lookupByKey(keyId: String): Key = {
      val jwk = findJWK(keyId)
      constructKey(jwk)
    }

    private def findJWK(keyId: String): JSONWebKey = {
      oidcDiscovery.getKeySet
        .find(_.kid == keyId)
        .get
    }

    private def constructKey(jwk: JSONWebKey): Key = {
      if (jwk.kty != supportedAlg) {
        throw new UnsupportedOperationException(s"Unsupported algorithm used for signing token '${jwk.kty}'")
      }
      val modulus = new BigInteger(1, Base64.decodeBase64(jwk.n))
      val pubExponent = new BigInteger(1, Base64.decodeBase64(jwk.e))

      val publicSpec = new RSAPublicKeySpec(modulus, pubExponent)

      val factory = KeyFactory.getInstance(supportedAlg)

      factory.generatePublic(publicSpec)
    }
  }

}
