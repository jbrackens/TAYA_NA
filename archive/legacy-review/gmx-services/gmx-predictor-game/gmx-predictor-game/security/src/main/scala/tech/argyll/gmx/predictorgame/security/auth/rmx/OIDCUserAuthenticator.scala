package tech.argyll.gmx.predictorgame.security.auth.rmx

import java.math.BigInteger
import java.security.spec.RSAPublicKeySpec
import java.security.{Key, KeyFactory}

import com.softwaremill.sttp.{SttpBackend, _}
import com.typesafe.scalalogging.LazyLogging
import io.jsonwebtoken.impl.DefaultJwtParser
import io.jsonwebtoken.{Claims, JwtParser}
import org.apache.commons.codec.binary.Base64
import play.api.libs.json.Json
import tech.argyll.gmx.predictorgame.security.auth.config._
import tech.argyll.gmx.predictorgame.security.auth.jwt.{JSONWebKey, SigningKeyByIdResolver}

import scala.concurrent.ExecutionContext

class OIDCUserAuthenticator(rmxConfig: RMXConfig, tokenConfig: TokenExpiryConfig, oidcDiscovery: OIDCDiscovery)
                           (implicit httpBackend: SttpBackend[Id, Nothing], ec: ExecutionContext)
  extends LazyLogging {

  private val jwtParser: JwtParser = new DefaultJwtParser()
    .setAllowedClockSkewSeconds(tokenConfig.clockSkew.toSeconds)
    .setSigningKeyResolver(new OIDCSigningKeyResolver(rmxConfig, oidcDiscovery))

  def authenticateUser(username: String, password: String): OIDCToken = {
    val token = authenticate(username, password)
    val expires = extractExpires(token)

    OIDCToken(token, expires, tokenConfig.offset.toSeconds)
  }

  private def authenticate(username: String, password: String) = {
    logger.debug(s"Authenticating '$username' user in RMX")

    val authUrl = oidcDiscovery.getTokenEndpoint
    val request = sttp.post(uri"$authUrl")
      .contentType(MediaTypes.Form)
      .body(Map("grant_type" -> "password",
        "username" -> username,
        "password" -> password))
      .auth.basic(rmxConfig.clientId, rmxConfig.clientPassword)

    val response = request.send()
    val responseJSON = Json.parse(response.unsafeBody)

    logger.debug(s"Authenticating '$username' user in RMX - DONE")
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
