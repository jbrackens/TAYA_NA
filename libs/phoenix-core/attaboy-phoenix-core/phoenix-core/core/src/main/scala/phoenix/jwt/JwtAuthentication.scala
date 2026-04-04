package phoenix.jwt

import cats.data.NonEmptyList
import cats.syntax.either._
import cats.syntax.option._
import phoenix.core.exceptions.ErrorType.Business
import phoenix.core.exceptions.{ DomainException, ErrorMessage }
import org.jose4j.jwt.JwtClaims
import org.keycloak.representations.AccessToken

case class PhoenixJwtClaims(userId: String)

object PhoenixJwtClaims {
  val userId = "userId"
  val phoenixBackend = "phoenix-backend"

  def fromJwtClaims(jwtClaims: JwtClaims) =
    Either
      .catchNonFatal {
        val claims = jwtClaims.getClaimsMap
        claims.get(userId).toString
      }
      .leftMap(e => DomainException(Business, 401, NonEmptyList.one(ErrorMessage(e.getMessage)), e.some))
      .map(userId => PhoenixJwtClaims(userId))
}

trait JwtAuthenticator {
  def verify(token: String): Either[DomainException, AccessToken]

  def verifyAndExtractClaims(token: String): Either[DomainException, PhoenixJwtClaims]
}
