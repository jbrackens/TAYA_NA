package phoenix.keycloak

import java.io.FileInputStream

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.blocking

import cats.data.EitherT
import cats.syntax.either._
import org.keycloak.adapters.KeycloakDeployment
import org.keycloak.adapters.rotation.AdapterTokenVerifier
import org.keycloak.jose.jws.JWSInput
import org.keycloak.representations.AccessToken

import phoenix.core.EitherTUtils._
import phoenix.http.BearerToken
import phoenix.jwt.CustomKeycloakDeploymentBuilder
import phoenix.jwt.JwtAuthenticator
import phoenix.jwt.JwtAuthenticator.InactiveAuthTokenError
import phoenix.jwt.JwtAuthenticator.InvalidAuthTokenError
import phoenix.jwt.JwtConfig
import phoenix.jwt.KeycloakInstallation
import phoenix.jwt.Permissions

final class KeycloakTokenVerifier(config: KeycloakConfig) extends JwtAuthenticator {

  private val installation = KeycloakInstallation.load(config.clientConfLocation)
  private lazy val authzClient = AuthzClientHelper.create(installation)
  private val deployment = createDeployment()

  private def createDeployment(): Either[Throwable, KeycloakDeployment] =
    Either.catchNonFatal {
      val is = new FileInputStream(config.clientConfLocation)
      CustomKeycloakDeploymentBuilder.build(is)
    }

  override def verifyWithoutIntrospection(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, InvalidAuthTokenError, Permissions] = {

    // It may connect to an external service when the app starts and doesn't know the pubkey yet, or when the signature
    // validation fails (to make sure that the pubkey advertised by the OIDC provider didn't change in the meantime).
    def verifyTokenObtainingKeyFromKeycloak(deployment: KeycloakDeployment, input: JWSInput)(implicit
        ec: ExecutionContext): EitherT[Future, Throwable, AccessToken] = {
      EitherT {
        Future {
          blocking {
            Either.catchNonFatal {
              AdapterTokenVerifier.verifyToken(input.getWireString, deployment)
            }
          }
        }
      }
    }

    val permissionsFromVerifiedToken = for {
      actualDeployment <- EitherT.fromEither[Future](deployment)
      input <- EitherT.fromEither[Future](Either.catchNonFatal {
        new JWSInput(bearerToken.rawValue)
      })
      accessToken <- verifyTokenObtainingKeyFromKeycloak(actualDeployment, input)
    } yield Permissions.fromAccessToken(accessToken)
    permissionsFromVerifiedToken.leftMap(InvalidAuthTokenError)
  }

  override protected def introspectTokenOnProvider(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, InactiveAuthTokenError.type, Unit] = {
    val introspectCallFuture = Future {
      blocking {
        authzClient.protection.introspectRequestingPartyToken(bearerToken.rawValue)
      }
    }
    EitherT {
      // We deliberately ignore the permissions from the introspection response since they're not useful
      introspectCallFuture.map(response => Either.cond(response.getActive, (), InactiveAuthTokenError))
    }
  }
}

class DisabledKeycloakTokenVerifier(defaultUserId: String) extends JwtAuthenticator {

  override def verifyWithoutIntrospection(token: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, InvalidAuthTokenError, Permissions] = {
    val accessToken = new AccessToken
    accessToken.setSubject(defaultUserId)
    EitherT.safeRightT(Permissions.fromAccessToken(accessToken))
  }

  override protected def introspectTokenOnProvider(bearerToken: BearerToken)(implicit
      ec: ExecutionContext): EitherT[Future, InactiveAuthTokenError.type, Unit] = {
    EitherT.safeRightT(())
  }
}

object KeycloakTokenVerifier {

  def build(jwtConfig: JwtConfig, keyclockConfig: KeycloakConfig): JwtAuthenticator = {
    if (jwtConfig.requireJwtAuthentication) {
      new KeycloakTokenVerifier(keyclockConfig)
    } else {
      new DisabledKeycloakTokenVerifier(jwtConfig.defaultUserId)
    }
  }
}
