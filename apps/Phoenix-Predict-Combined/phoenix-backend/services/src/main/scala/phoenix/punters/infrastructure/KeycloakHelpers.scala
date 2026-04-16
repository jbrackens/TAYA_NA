package phoenix.punters.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.OptionT

import phoenix.punters.KeycloakDataConverter
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.RegisteredUser
import phoenix.punters.domain.RegisteredUserAndPunter
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN

object KeycloakHelpers {
  def additionalSsnLookup(authenticationRepository: AuthenticationRepository)(id: PunterId)(implicit
      ec: ExecutionContext): Future[Option[Last4DigitsOfSSN]] = {
    authenticationRepository
      .findUserWithLegacyFields(UserLookupId.byPunterId(id))
      .map(maybeUser => maybeUser.flatMap(_.last4DigitsOfSSN))
  }

  def getRegisteredUser[ERR](
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      punterId: PunterId,
      missingInKeycloak: => ERR,
      missingInPuntersRepository: => ERR)(implicit ec: ExecutionContext): EitherT[Future, ERR, RegisteredUser] = {
    getRegisteredUserAndPunter(
      authenticationRepository,
      puntersRepository,
      punterId,
      missingInKeycloak,
      missingInPuntersRepository).map(_.registeredUser)
  }

  def getRegisteredUserAndPunter[ERR](
      authenticationRepository: AuthenticationRepository,
      puntersRepository: PuntersRepository,
      punterId: PunterId,
      missingInKeycloak: => ERR,
      missingInPuntersRepository: => ERR)(implicit
      ec: ExecutionContext): EitherT[Future, ERR, RegisteredUserAndPunter] = {
    val eventualMaybeRegisteredUserKeycloak = authenticationRepository.findUser(UserLookupId.byPunterId(punterId))
    val eventualMaybePunter = puntersRepository.findByPunterId(punterId)
    for {
      kcUser <- OptionT(eventualMaybeRegisteredUserKeycloak).toRight[ERR](missingInKeycloak)
      punter <- eventualMaybePunter.toRight[ERR](missingInPuntersRepository)
      registeredUser <- KeycloakDataConverter.mergeAndLog(kcUser, punter, missingInPuntersRepository)
    } yield RegisteredUserAndPunter(registeredUser, punter)
  }
}
