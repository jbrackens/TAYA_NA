package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.application.RetrievePunterProfileError.AuthenticationProfileNotFound
import phoenix.punters.application.RetrievePunterProfileError.PunterProfileNotFoundInRepository
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUserKeycloak
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.TermsValidator
import phoenix.punters.domain.UserProfile
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.ResponsibilityCheckStatus

final class RetrievePunterProfile(
    authenticationRepository: AuthenticationRepository,
    puntersBoundedContext: PuntersBoundedContext,
    walletsBoundedContext: WalletsBoundedContext,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    puntersRepository: PuntersRepository,
    clock: Clock)(implicit ec: ExecutionContext) {

  def retrievePunterProfile(punterId: PunterId): EitherT[Future, RetrievePunterProfileError, UserProfile] = {
    val eventualPunterProfile = getPunterProfileFromPunters(punterId)
    val eventualKeycloakUser = getAuthenticationUser(punterId)
    val eventualPunter = puntersRepository.findByPunterId(punterId)
    for {
      terms <- EitherT.liftF(termsAndConditionsRepository.getCurrentTerms())
      punterProfile <- eventualPunterProfile
      authenticationUser <- eventualKeycloakUser.leftWiden[RetrievePunterProfileError]
      punter <- eventualPunter.toRight(PunterProfileNotFoundInRepository)
      responsibilityCheckStatus <- getResponsibilityCheckStatus(punterId).leftWiden[RetrievePunterProfileError]
      hasToAcceptTerms = TermsValidator.doTermsNeedToBeAccepted(
        terms.currentTermsVersion,
        terms.termsDaysThreshold,
        clock.currentOffsetDateTime(),
        punter.settings.termsAgreement)
    } yield UserProfile.from(
      punterProfile,
      punter,
      authenticationUser,
      hasToAcceptTerms = hasToAcceptTerms,
      responsibilityCheckStatus)
  }

  private def getPunterProfileFromPunters(punterId: PunterId)
      : EitherT[Future, RetrievePunterProfileError.PunterProfileNotFoundInContext.type, PunterProfile] =
    puntersBoundedContext
      .getPunterProfile(punterId)
      .leftMap((_: PunterProfileDoesNotExist) => RetrievePunterProfileError.PunterProfileNotFoundInContext)

  private def getAuthenticationUser(punterId: PunterId)
      : EitherT[Future, RetrievePunterProfileError.AuthenticationProfileNotFound.type, RegisteredUserKeycloak] =
    EitherT.fromOptionF(
      authenticationRepository.findUser(UserLookupId.byPunterId(punterId)),
      AuthenticationProfileNotFound)

  private def getResponsibilityCheckStatus(
      punterId: PunterId): EitherT[Future, RetrievePunterProfileError.WalletNotFound.type, ResponsibilityCheckStatus] =
    walletsBoundedContext
      .findResponsibilityCheckStatus(WalletId.deriveFrom(punterId))
      .leftMap((_: WalletNotFoundError) => RetrievePunterProfileError.WalletNotFound)
}

sealed trait RetrievePunterProfileError
object RetrievePunterProfileError {
  case object PunterProfileNotFoundInContext extends RetrievePunterProfileError
  case object PunterProfileNotFoundInRepository extends RetrievePunterProfileError
  case object AuthenticationProfileNotFound extends RetrievePunterProfileError
  case object WalletNotFound extends RetrievePunterProfileError
}
