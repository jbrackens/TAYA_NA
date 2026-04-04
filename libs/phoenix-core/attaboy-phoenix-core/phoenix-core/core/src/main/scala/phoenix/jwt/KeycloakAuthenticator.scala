package phoenix.jwt

import java.io.InputStream

import cats.data.NonEmptyList
import cats.syntax.either._
import cats.syntax.option._
import org.keycloak.adapters.KeycloakDeployment
import org.keycloak.adapters.rotation.AdapterTokenVerifier
import org.keycloak.jose.jws.JWSInput
import org.keycloak.representations.AccessToken
import phoenix.core.exceptions.ErrorType.Business
import phoenix.core.exceptions.{ DomainException, ErrorMessage }

class KeycloakTokenVerifier(keycloakJsonStream: () => InputStream) extends JwtAuthenticator {

  private val deployment = createDeployment()

  private def createDeployment(): Either[Throwable, KeycloakDeployment] =
    Either.catchNonFatal {
      CustomKeycloakDeploymentBuilder.build(keycloakJsonStream())
    }

  private[this] def extractClaims(accessToken: AccessToken): Either[DomainException, PhoenixJwtClaims] =
    Either.right(PhoenixJwtClaims(accessToken.getSubject))

  override def verify(token: String): Either[DomainException, AccessToken] =
    deployment
      .flatMap(actualDeployment =>
        Either.catchNonFatal {
          val bearerHeader = "Bearer"
          val tokenStr = if (token.startsWith(bearerHeader)) token.drop(bearerHeader.length).trim else token
          val input = new JWSInput(tokenStr)
          AdapterTokenVerifier.verifyToken(input.getWireString, actualDeployment)
        })
      .leftMap(createDomainError)

  override def verifyAndExtractClaims(token: String): Either[DomainException, PhoenixJwtClaims] =
    for {
      verifiedToken <- verify(token)
      claims <- extractClaims(verifiedToken)
    } yield claims

  private[this] def createDomainError(error: Throwable) =
    DomainException(Business, 401, NonEmptyList.one(ErrorMessage("Invalid auth token provided")), error.some)
}

class DisabledKeycloakTokenVerifier(defaultUserId: String) extends JwtAuthenticator {

  override def verify(token: String): Either[DomainException, AccessToken] = {
    val accessToken = new AccessToken
    accessToken.setSubject(defaultUserId)
    Either.right(accessToken)
  }

  override def verifyAndExtractClaims(token: String): Either[DomainException, PhoenixJwtClaims] =
    Either.right(PhoenixJwtClaims(userId = defaultUserId))

}

object KeycloakTokenVerifier {

  def build(jwtConfig: JwtConfig, keycloakJsonStream: () => InputStream): JwtAuthenticator = {
    if (jwtConfig.requireJwtAuthentication) {
      new KeycloakTokenVerifier(keycloakJsonStream)
    } else {
      new DisabledKeycloakTokenVerifier(jwtConfig.defaultUserId)
    }
  }
}
