package phoenix.punters.application

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Try

import cats.data.EitherT
import cats.syntax.bifunctor._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.emailing.Mailer
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrl
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.ForgotPasswordError.PunterNotFound
import phoenix.punters.domain.AccountVerificationCode
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.punters.domain.Email
import phoenix.punters.domain.EmailNotification.ResetPassword
import phoenix.punters.domain.EmailNotification.ResetPassword.ResetPasswordParams
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterSearch
import phoenix.punters.domain.PunterStatus.Deleted
import phoenix.punters.domain.PunterStatus.Suspended
import phoenix.punters.domain.PuntersRepository

final class ForgotPassword(
    accountVerificationCodeRepository: AccountVerificationCodeRepository,
    puntersRepository: PuntersRepository,
    punters: PuntersBoundedContext,
    mailer: Mailer,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def forgotPassword(email: Email, phoenixAppBaseUrl: PhoenixAppBaseUrl): EitherT[Future, ForgotPasswordError, Unit] =
    for {
      punter <- EitherT.fromOptionF(
        puntersRepository.findFirstPunterByFilters(PunterSearch(email = Some(email))),
        ForgotPasswordError.PunterNotFound)
      _ <- checkPunterProfileIsAuthorized(punter.punterId)
      _ <- enforceMultiFactorVerification(punter)
      punterUuid <- EitherT.fromEither[Future](Try(UUID.fromString(punter.punterId.value)).toEither).leftMap { err =>
        log.error(s"punterId ${punter.punterId} is not UUID", err)
        PunterNotFound
      }
      accountVerificationCode <- EitherT.liftF(accountVerificationCodeRepository.create(punterUuid))
      _ <- sendResetPasswordEmail(email, accountVerificationCode, phoenixAppBaseUrl)
    } yield ()

  private def checkPunterProfileIsAuthorized(punterId: PunterId): EitherT[Future, ForgotPasswordError, Unit] =
    for {
      punterProfile <- punters.getPunterProfile(punterId).leftMap(_ => ForgotPasswordError.PunterNotFound)
      isSuspendedOrDeleted = punterProfile.status match {
        case Suspended(_) | Deleted => true
        case _                      => false
      }
      _ <-
        EitherT
          .cond[Future](!isSuspendedOrDeleted, (), ForgotPasswordError.PunterNotAuthorized)
          .leftWiden[ForgotPasswordError]
    } yield ()

  private def enforceMultiFactorVerification(registeredUser: Punter): EitherT[Future, ForgotPasswordError, Unit] =
    if (!registeredUser.settings.mfaEnabled) {
      puntersRepository
        .updateSettings(registeredUser.punterId, _.copy(mfaEnabled = true))
        .leftMap(_ => ForgotPasswordError.PunterNotFound)
    } else {
      EitherT.safeRightT(())
    }

  private def sendResetPasswordEmail(
      email: Email,
      accountVerificationCode: AccountVerificationCode,
      phoenixAppBaseUrl: PhoenixAppBaseUrl): EitherT[Future, ForgotPasswordError, Unit] = {
    val now = clock.currentOffsetDateTime()
    val resetPasswordURL: String =
      s"${phoenixAppBaseUrl.value}/reset-password?token=${accountVerificationCode.urlEncodedId}"
    val template = ResetPassword.build(email, ResetPasswordParams(resetPasswordURL, now))
    EitherT.liftF[Future, ForgotPasswordError, Unit](mailer.send(template))
  }
}

sealed trait ForgotPasswordError
object ForgotPasswordError {
  case object PunterNotFound extends ForgotPasswordError
  case object PunterNotAuthorized extends ForgotPasswordError
}
