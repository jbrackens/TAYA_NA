package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import org.keycloak.representations.idm.authorization.AuthorizationResponse

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.AuthenticationRepository.Errors.InvalidRefreshToken
import phoenix.punters.domain.AuthenticationRepository.Errors.UnauthorizedLoginError
import phoenix.punters.domain.AuthenticationRepository.Errors.UserNotFound
import phoenix.punters.domain.AuthenticationRepository.UserLookupId

trait AuthenticationRepository {
  def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]]

  def findUserWithLegacyFields(
      userId: UserLookupId)
      : Future[Option[RegisteredUserKeycloakWithLegacyFields]] // TODO (PHXD-2996): for legacy lookup

  def userExists(userId: UserLookupId): Future[Boolean]

  def signIn(
      username: Username,
      password: MaybeValidPassword): EitherT[Future, UnauthorizedLoginError.type, UserTokenResponse]

  def signOut(punterId: PunterId): Future[Unit]

  def register(userDetails: UserDetailsKeycloak, password: ValidPassword): Future[PunterId]

  def verifyEmail(punterId: PunterId): Future[EmailVerificationResult]

  def updateUser(punterId: PunterId, user: UserDetailsKeycloak): Future[Unit]

  def updateUser(punterId: PunterId, update: UserDetailsKeycloak => UserDetailsKeycloak)(implicit
      ec: ExecutionContext): EitherT[Future, UserNotFound.type, Unit] =
    for {
      user <- EitherT.fromOptionF(findUser(UserLookupId.byPunterId(punterId)), UserNotFound)
      _ <- EitherT.liftF(updateUser(punterId, update(user.details)))
    } yield ()

  def changePassword(punterId: PunterId, newPassword: ValidPassword): EitherT[Future, UserNotFound.type, Unit]

  def refreshToken(token: RefreshToken): EitherT[Future, InvalidRefreshToken.type, UserTokenResponse]

  def obtainServiceScopeToken(): Future[ServiceTokenResponse]

  def removeUser(punterId: PunterId): Future[Unit]
}

object AuthenticationRepository {
  sealed trait UserLookupId
  object UserLookupId {
    final case class ByPunterId private[UserLookupId] (id: PunterId) extends UserLookupId
    final case class ByUsername(username: Username) extends UserLookupId
    final case class ByEmail(email: Email) extends UserLookupId

    def byPunterId(id: PunterId): UserLookupId = ByPunterId(id)
    def byUsername(username: Username): UserLookupId = ByUsername(username)
    def byEmail(email: Email): UserLookupId = ByEmail(email)
  }

  object Errors {
    case object InvalidRefreshToken
    case object UnauthorizedLoginError
    case object UserNotFound
  }
}

sealed trait EmailVerificationResult
object EmailVerificationResult {
  final case object Success extends EmailVerificationResult
  final case object UserNotFound extends EmailVerificationResult
}

sealed trait PhoneNumberVerificationResult
object PhoneNumberVerificationResult {
  final case object Success extends PhoneNumberVerificationResult
  final case object UserNotFound extends PhoneNumberVerificationResult
}

final case class UserTokenResponse(
    userId: String,
    token: String,
    expiresIn: Long,
    refreshExpiresIn: Long,
    refreshToken: RefreshToken,
    tokenType: String,
    idToken: Option[String])

object UserTokenResponse {
  def fromAuthorizationResponse(userId: String, response: AuthorizationResponse): UserTokenResponse =
    UserTokenResponse(
      userId = userId,
      token = response.getToken,
      expiresIn = response.getExpiresIn,
      refreshExpiresIn = response.getRefreshExpiresIn,
      refreshToken = RefreshToken(response.getRefreshToken),
      tokenType = response.getTokenType,
      idToken = Option(response.getIdToken))
}

final case class ServiceTokenResponse(
    token: String,
    expiresIn: Long,
    refreshExpiresIn: Long,
    refreshToken: String,
    tokenType: String,
    idToken: Option[String])

final case class RefreshToken(value: String)
object RefreshToken {
  /*
   * We put 30 additional seconds before automatically ending the punter session due to the refreshToken expiry.
   * This is to avoid race conditions between the cron job that reads the database and a possible refresh from the FE.
   */
  private val delayOnTokenExpiryInSeconds = 30
  def refreshTokenTimeout(clock: Clock, expiresInSec: Long): OffsetDateTime =
    clock.currentOffsetDateTime().plusSeconds(expiresInSec).plusSeconds(delayOnTokenExpiryInSeconds)
}
