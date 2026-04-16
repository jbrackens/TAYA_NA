package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.application.AcceptTermsError.AcceptedVersionWasNotTheLatest
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.TermsAndConditionsRepository

final class AcceptTerms(
    termsAndConditionsRepository: TermsAndConditionsRepository,
    puntersRepository: PuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext) {

  def acceptTerms(
      punterId: PunterId,
      acceptedVersion: TermsAcceptedVersion): EitherT[Future, AcceptTermsError, Unit] = {
    for {
      _ <- guardAcceptedVersionIsLatest(acceptedVersion)
      _ <- updateUserWithLastAcceptedVersion(punterId, acceptedVersion)
    } yield ()
  }

  private def guardAcceptedVersionIsLatest(
      acceptedVersion: TermsAcceptedVersion): EitherT[Future, AcceptTermsError, Unit] = {
    EitherT(
      termsAndConditionsRepository
        .getCurrentTerms()
        .map(terms =>
          if (acceptedVersion.value == terms.currentTermsVersion.value) Right(())
          else Left(AcceptedVersionWasNotTheLatest)))

  }

  private def updateUserWithLastAcceptedVersion(
      punterId: PunterId,
      acceptedVersion: TermsAcceptedVersion): EitherT[Future, AcceptTermsError, Unit] = {
    puntersRepository
      .updateSettings(punterId, _.copy(termsAgreement = TermsAgreement(acceptedVersion, clock.currentOffsetDateTime())))
      .leftMap {
        case PuntersRepositoryErrors.PunterIdNotFoundInSettings => AcceptTermsError.PunterNotFound
      }
  }
}

sealed trait AcceptTermsError
object AcceptTermsError {
  case object AcceptedVersionWasNotTheLatest extends AcceptTermsError
  case object PunterNotFound extends AcceptTermsError
}
