package phoenix.punters.support

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.EitherTUtils._
import phoenix.punters.PunterDataGenerator.generateRegisteredUserKeycloak
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.MaybeValidPassword
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.Errors
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.EmailVerificationResult
import phoenix.punters.domain.RefreshToken
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.RegisteredUserKeycloakWithLegacyFields
import phoenix.punters.domain.ServiceTokenResponse
import phoenix.punters.domain.UserDetailsKeycloak
import phoenix.punters.domain.UserTokenResponse
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword
import phoenix.punters.support.TestAuthenticationRepository.defaultServiceTokenResponse
import phoenix.punters.support.TestAuthenticationRepository.defaultUserTokenResponse
import phoenix.support.DataGenerator

class TestAuthenticationRepository(implicit ec: ExecutionContext) extends AuthenticationRepository {
  override def signIn(
      username: Username,
      password: MaybeValidPassword): EitherT[Future, Errors.UnauthorizedLoginError.type, UserTokenResponse] =
    EitherT.safeRightT(defaultUserTokenResponse)

  override def signOut(punterId: PunterId): Future[Unit] = Future.unit

  override def register(userDetails: UserDetailsKeycloak, password: ValidPassword): Future[PunterId] =
    Future.successful(PunterId(defaultUserTokenResponse.userId))

  override def verifyEmail(punterId: PunterId): Future[EmailVerificationResult] =
    Future.successful(EmailVerificationResult.Success)

  override def updateUser(punterId: PunterId, user: UserDetailsKeycloak): Future[Unit] = Future.unit

  override def changePassword(
      punterId: PunterId,
      newPassword: ValidPassword): EitherT[Future, Errors.UserNotFound.type, Unit] =
    EitherT.safeRightT(())

  override def findUser(userId: AuthenticationRepository.UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
    Future.successful(None)
  }

  override def findUserWithLegacyFields(
      userId: UserLookupId): Future[Option[RegisteredUserKeycloakWithLegacyFields]] = {
    Future.successful(None)
  }

  override def userExists(userId: AuthenticationRepository.UserLookupId): Future[Boolean] =
    Future.successful(false)

  override def refreshToken(token: RefreshToken): EitherT[Future, Errors.InvalidRefreshToken.type, UserTokenResponse] =
    EitherT.safeRightT(defaultUserTokenResponse)

  override def obtainServiceScopeToken(): Future[ServiceTokenResponse] =
    Future.successful(defaultServiceTokenResponse)

  override def removeUser(punterId: PunterId): Future[Unit] =
    Future.unit
}

object TestAuthenticationRepository {
  val defaultUserTokenResponse: UserTokenResponse = UserTokenResponse(
    userId = DataGenerator.generateIdentifier(),
    token = "test_user_token",
    expiresIn = 100L,
    refreshExpiresIn = 1000L,
    refreshToken = RefreshToken("test_refresh_token"),
    tokenType = "test_token_type",
    idToken = None)

  val defaultServiceTokenResponse: ServiceTokenResponse = ServiceTokenResponse(
    token = "test_service_token",
    expiresIn = 100L,
    refreshExpiresIn = 1000L,
    refreshToken = "test_refresh_token",
    tokenType = "test_token_type",
    idToken = None)
}

class MemorizingTestAuthenticationRepository(
    var registrations: List[(UserDetailsKeycloak, ValidPassword)] = List.empty,
    var emailVerifications: List[PunterId] = List.empty,
    var userUpdates: List[(PunterId, UserDetailsKeycloak)] = List.empty,
    var signOutUpdates: List[PunterId] = List.empty,
    var removals: List[PunterId] = List.empty,
    var passwordChanges: List[PunterId] = List.empty)(implicit ec: ExecutionContext)
    extends TestAuthenticationRepository {
  override def register(userDetails: UserDetailsKeycloak, password: ValidPassword): Future[PunterId] = {
    registrations = registrations :+ ((userDetails, password))
    super.register(userDetails, password)
  }
  override def findUser(userId: UserLookupId): Future[Option[RegisteredUserKeycloak]] = {
    Future.successful(Some(generateRegisteredUserKeycloak()))
  }

  override def verifyEmail(punterId: PunterId): Future[EmailVerificationResult] = {
    emailVerifications = emailVerifications :+ punterId
    super.verifyEmail(punterId)
  }

  override def updateUser(punterId: PunterId, user: UserDetailsKeycloak): Future[Unit] = {
    userUpdates = userUpdates :+ ((punterId, user))
    super.updateUser(punterId, user)
  }

  override def signOut(punterId: PunterId): Future[Unit] = {
    signOutUpdates = signOutUpdates :+ punterId
    super.signOut(punterId)
  }

  override def removeUser(punterId: PunterId): Future[Unit] = {
    removals = removals :+ punterId
    super.removeUser(punterId)
  }

  override def changePassword(
      punterId: PunterId,
      newPassword: ValidPassword): EitherT[Future, Errors.UserNotFound.type, Unit] = {
    passwordChanges = passwordChanges :+ punterId
    super.changePassword(punterId, newPassword)
  }
}
