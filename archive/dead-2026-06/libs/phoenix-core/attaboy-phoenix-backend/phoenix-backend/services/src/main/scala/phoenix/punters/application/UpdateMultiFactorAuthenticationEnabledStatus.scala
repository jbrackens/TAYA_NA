package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.MultifactorVerificationCode
import phoenix.punters.domain.MultifactorVerificationId
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFoundInSettings
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.VerificationFailure

final class UpdateMultiFactorAuthenticationEnabledStatus(
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersDomainConfig: PuntersDomainConfig)(implicit ec: ExecutionContext) {

  def update(
      punterId: PunterId,
      newMFAEnabledStatus: Boolean,
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      : EitherT[Future, UpdateMultiFactorAuthenticationEnabledStatusError, Unit] = {
    for {
      punterData <- findPunterData(punterId)
      _ <- ensureChangingMFAIsAllowed(punterData, newMFAEnabledStatus)
      _ <- ensureVerification(verificationId, verificationCode)
      _ <- updateMFAEnabledStatus(punterId, newMFAEnabledStatus)
    } yield ()
  }

  private def ensureChangingMFAIsAllowed(
      punter: RegisteredUserKeycloak,
      newMFAEnabledStatus: Boolean): EitherT[Future, UpdateMultiFactorAuthenticationEnabledStatusError, Unit] = {
    EitherT.cond[Future](
      puntersDomainConfig.mfa.changeAllowed || newMFAEnabledStatus || punter.admin,
      (),
      UpdateMultiFactorAuthenticationEnabledStatusError.MFAChangeNotAllowed)
  }

  private def ensureVerification(
      verificationId: MultifactorVerificationId,
      verificationCode: MultifactorVerificationCode)
      : EitherT[Future, UpdateMultiFactorAuthenticationEnabledStatusError, Unit] = {
    import VerificationFailure._
    multiFactorAuthenticationService.approveVerification(verificationId, verificationCode).leftMap {
      case IncorrectVerificationCode | VerificationExpiredOrAlreadyApproved =>
        UpdateMultiFactorAuthenticationEnabledStatusError.InvalidMFAVerification
      case MaxCheckAttemptsReached =>
        UpdateMultiFactorAuthenticationEnabledStatusError.MaxMFACheckAttemptsReached
      case UnknownVerificationFailure =>
        UpdateMultiFactorAuthenticationEnabledStatusError.MFAVerificationFailed
    }
  }

  private def findPunterData(punterId: PunterId)
      : EitherT[Future, UpdateMultiFactorAuthenticationEnabledStatusError.PunterNotFound.type, RegisteredUserKeycloak] =
    EitherT.fromOptionF(
      authenticationRepository.findUser(UserLookupId.byPunterId(punterId)),
      ifNone = UpdateMultiFactorAuthenticationEnabledStatusError.PunterNotFound)

  private def updateMFAEnabledStatus(
      punterId: PunterId,
      newMFAEnabledStatus: Boolean): EitherT[Future, UpdateMultiFactorAuthenticationEnabledStatusError, Unit] = {
    puntersRepository
      .updateSettings(punterId, _.copy(mfaEnabled = newMFAEnabledStatus))
      .leftMap[UpdateMultiFactorAuthenticationEnabledStatusError] {
        case PunterIdNotFoundInSettings => UpdateMultiFactorAuthenticationEnabledStatusError.PunterNotFound
      }
  }
}

sealed trait UpdateMultiFactorAuthenticationEnabledStatusError
object UpdateMultiFactorAuthenticationEnabledStatusError {
  case object MFAChangeNotAllowed extends UpdateMultiFactorAuthenticationEnabledStatusError
  case object InvalidMFAVerification extends UpdateMultiFactorAuthenticationEnabledStatusError
  case object PunterNotFound extends UpdateMultiFactorAuthenticationEnabledStatusError
  case object MFAVerificationFailed extends UpdateMultiFactorAuthenticationEnabledStatusError
  case object MaxMFACheckAttemptsReached extends UpdateMultiFactorAuthenticationEnabledStatusError
}
