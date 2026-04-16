package phoenix.punters.infrastructure

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Try

import akka.actor.typed.ActorSystem
import akka.http.scaladsl.model.FormData
import akka.http.scaladsl.model.HttpMethods
import akka.http.scaladsl.model.HttpRequest
import akka.http.scaladsl.model.StatusCodes._
import akka.http.scaladsl.unmarshalling.Unmarshal
import cats.data.EitherT
import cats.data.OptionT
import cats.syntax.either._
import io.circe.Codec
import io.circe.generic.semiauto.deriveCodec
import org.keycloak.admin.client.CreatedResponseUtil
import org.keycloak.authorization.client.util.HttpResponseException
import org.keycloak.representations.idm.UserRepresentation
import org.keycloak.representations.idm.authorization.AuthorizationRequest
import org.slf4j.LoggerFactory

import phoenix.http.BearerToken
import phoenix.http.JsonMarshalling._
import phoenix.http.core.HttpClient
import phoenix.jwt.JwtAuthenticator.JwtAuthenticationError
import phoenix.jwt.KeycloakInstallation
import phoenix.jwt.Permissions
import phoenix.keycloak.AuthzClientHelper
import phoenix.keycloak.KeycloakConfig
import phoenix.keycloak.KeycloakTokenVerifier
import phoenix.keycloak.KeycloakUtils._
import phoenix.punters.KeycloakUser
import phoenix.punters.KeycloakUserConverter
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.AuthenticationRepository.Errors
import phoenix.punters.domain.AuthenticationRepository.Errors.InvalidRefreshToken
import phoenix.punters.domain.AuthenticationRepository.Errors.UnauthorizedLoginError
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain._
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository.ClientIdKey
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository.ClientSecretKey
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository.GrantTypeKey
import phoenix.punters.infrastructure.KeycloakAuthenticationRepository.RefreshTokenKey
import phoenix.utils.ThrowableWithCause

final class KeycloakAuthenticationRepository(config: KeycloakConfig, httpClient: HttpClient)(implicit
    system: ActorSystem[_],
    ec: ExecutionContext)
    extends AuthenticationRepository {

  private val log = LoggerFactory.getLogger(this.getClass)

  private lazy val installation = KeycloakInstallation.load(config.clientConfLocation)
  private lazy val authzClient = AuthzClientHelper.create(installation)
  private lazy val keycloakTokenVerifier = new KeycloakTokenVerifier(config)

  private lazy val phoenix = keycloakFor(installation)
  private lazy val phoenixRealm = phoenix.realm(installation.realm)
  private lazy val phoenixUsers = phoenixRealm.users()

  private lazy val baseUrl = s"${installation.authServerUrl}realms/${installation.realm}"
  private lazy val tokenUrl = baseUrl + "/protocol/openid-connect/token"

  override def signIn(
      username: Username,
      password: MaybeValidPassword): EitherT[Future, UnauthorizedLoginError.type, UserTokenResponse] =
    EitherT {
      Future {
        authzClient.authorization(username.value, password.value).authorize(new AuthorizationRequest)
      }.flatMap { response =>
        extractUserIdFromAccessToken(response.getToken)
          .map(userId => UserTokenResponse.fromAuthorizationResponse(userId.value, response))
          .leftSemiflatMap(underlying =>
            Future.failed(new RuntimeException(s"Unable to extract userId from token after login $underlying")))
          .value
      }.recover {
        case ThrowableWithCause(cause: HttpResponseException) if cause.getStatusCode == 401 =>
          Left(UnauthorizedLoginError)
        case e: HttpResponseException if e.getStatusCode == 401 =>
          Left(UnauthorizedLoginError)
      }
    }

  private def extractUserIdFromAccessToken(accessToken: String)(implicit
      ec: ExecutionContext): EitherT[Future, JwtAuthenticationError, Permissions.UserId] =
    keycloakTokenVerifier.verifyWithIntrospection(BearerToken(accessToken)).map(_.userId)

  override def signOut(punterId: PunterId): Future[Unit] =
    Future {
      val sessions = phoenixUsers.get(punterId.value).getUserSessions.asScala.toList
      sessions.foreach { session =>
        phoenixRealm.deleteSession(session.getId)
      }
    }

  override def register(userDetails: UserDetailsKeycloak, password: ValidPassword): Future[PunterId] =
    Future {
      val keycloakUser = KeycloakUser()
        .enabled(true)
        .withDetails(userDetails)
        .withPassword(password.value)
        .emailVerified(false)
        .includedInGroup(Groups.Punters)

      // Create user (requires manage-users role)
      val response = phoenixUsers.create(keycloakUser.value)
      val punterId = PunterId.fromUuid(UUID.fromString(CreatedResponseUtil.getCreatedId(response)))
      log.info("User created with punterId: {}", punterId)
      punterId
    }

  override def verifyEmail(punterId: PunterId): Future[EmailVerificationResult] =
    Future {
      val maybeUser = Option(phoenixUsers.get(punterId.value))
      maybeUser.fold[EmailVerificationResult](EmailVerificationResult.UserNotFound) { userResource =>
        val user = KeycloakUser(userResource.toRepresentation).emailVerified(true)
        userResource.update(user.value)
        EmailVerificationResult.Success
      }
    }

  override def updateUser(punterId: PunterId, newDetails: UserDetailsKeycloak): Future[Unit] =
    Future {
      val userResource = phoenixUsers.get(punterId.value)
      val user = KeycloakUser(userResource.toRepresentation).withDetails(newDetails)
      userResource.update(user.value)
    }

  override def changePassword(
      punterId: PunterId,
      newPassword: ValidPassword): EitherT[Future, Errors.UserNotFound.type, Unit] =
    EitherT(Future {
      val userResource = phoenixUsers.get(punterId.value)
      if (userResource.toRepresentation == null) {
        Left(Errors.UserNotFound)
      } else {
        Right(userResource.resetPassword(KeycloakUser.passwordCredentials(newPassword.value)))
      }
    })

  override def removeUser(punterId: PunterId): Future[Unit] = {
    Future {
      phoenixUsers.delete(punterId.value)
    }.map(_ => ())
  }

  override def findUser(key: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
    findUserWithExpectedFields(key, KeycloakUserConverter.fromKeycloak)
  }

  private def findUserWithExpectedFields[T](
      key: UserLookupId,
      converter: UserRepresentation => Option[T]): Future[Option[T]] = {
    OptionT(Future {
      key match {
        case UserLookupId.ByPunterId(id) => Try(Option(phoenixUsers.get(id.value).toRepresentation)).toOption.flatten
        case UserLookupId.ByUsername(username) =>
          phoenixUsers.search(username.value, /*exact*/ true).asScala.headOption
        case UserLookupId.ByEmail(email) =>
          phoenixUsers.search(email.value + ":EMAIL", /*exact*/ true).asScala.headOption
      }
    }).subflatMap(enrichWithRoles(_).flatMap(converter)).value
  }

  private def enrichWithRoles(userRepresentation: UserRepresentation): Option[UserRepresentation] = {
    Option(phoenixUsers.get(userRepresentation.getId)).map { userResource =>
      val roles = userResource.roles()
      val realmRoles = roles.realmLevel()
      userRepresentation.setRealmRoles(realmRoles.listAll().asScala.map(_.getName).asJava)
      userRepresentation
    }
  }

  // TODO (PHXD-2996): remove when all user data migrated from KC to DB
  override def findUserWithLegacyFields(key: UserLookupId): Future[Option[RegisteredUserKeycloakWithLegacyFields]] = {
    findUserWithExpectedFields(key, KeycloakUserConverter.fromKeycloakWithLegacyFields)
  }

  override def userExists(key: UserLookupId): Future[Boolean] = findUser(key).map(_.isDefined)

  override def refreshToken(token: RefreshToken): EitherT[Future, InvalidRefreshToken.type, UserTokenResponse] = {
    // Note that this endpoint IS NOT JSON.
    // This endpoints accepts 'application/x-www-form-urlencoded'.
    val entity = FormData(
      GrantTypeKey -> RefreshTokenKey,
      RefreshTokenKey -> token.value,
      ClientIdKey -> installation.clientId,
      ClientSecretKey -> installation.clientSecret).toEntity

    val request = HttpRequest(method = HttpMethods.POST, uri = tokenUrl).withEntity(entity)

    for {
      response <- EitherT.liftF(httpClient.sendRequest(request, unsafeBypassTLS = true))
      keycloakTokenResponse <-
        if (response.status.isSuccess) {
          EitherT.liftF(Unmarshal(response.entity).to[KeycloakTokenResponse])
        } else {
          EitherT {
            Unmarshal(response)
              .to[String]
              .map { rawBody =>
                log.error(s"request (POST $tokenUrl) status code: ${response.status}, failure: $rawBody")
              }
              .map { _ =>
                if (Set(BadRequest, Unauthorized, Forbidden).map(_.intValue).contains(response.status.intValue)) {
                  InvalidRefreshToken.asLeft
                } else {
                  throw new RuntimeException(s"unexpected response from Keycloak: status code is ${response.status}")
                }
              }
          }
        }
      userTokenResponse <- extractUserIdFromAccessToken(keycloakTokenResponse.access_token)
        .leftSemiflatMap(error =>
          Future.failed(new RuntimeException(s"unable to extract userId from token after refresh: $error")))
        .map { id =>
          UserTokenResponse(
            id.value,
            keycloakTokenResponse.access_token,
            keycloakTokenResponse.expires_in,
            keycloakTokenResponse.refresh_expires_in,
            RefreshToken(keycloakTokenResponse.refresh_token),
            keycloakTokenResponse.token_type,
            keycloakTokenResponse.id_token)
        }
    } yield userTokenResponse
  }

  override def obtainServiceScopeToken(): Future[ServiceTokenResponse] =
    Future {
      val accessToken = authzClient.obtainAccessToken()
      ServiceTokenResponse(
        accessToken.getToken,
        accessToken.getExpiresIn,
        accessToken.getRefreshExpiresIn,
        accessToken.getRefreshToken,
        accessToken.getTokenType,
        Option(accessToken.getIdToken))
    }
}

private object KeycloakAuthenticationRepository {
  val GrantTypeKey = "grant_type"
  val RefreshTokenKey = "refresh_token"
  val ClientIdKey = "client_id"
  val ClientSecretKey = "client_secret"
}

private final case class KeycloakTokenResponse(
    access_token: String, // Snake casing because of automatic json derivation.
    expires_in: Long,
    refresh_expires_in: Long,
    refresh_token: String,
    token_type: String,
    id_token: Option[String])

private object KeycloakTokenResponse {
  implicit val keycloakTokenResponseCodec: Codec[KeycloakTokenResponse] = deriveCodec
}
