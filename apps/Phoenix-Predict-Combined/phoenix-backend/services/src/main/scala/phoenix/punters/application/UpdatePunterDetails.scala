package phoenix.punters.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.traverse._

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.application.UpdatePunterProfileError.ConflictingData
import phoenix.punters.application.UpdatePunterProfileError.PunterNotFound
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterAddressRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterDetailsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterDobRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPersonalNameRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPhoneNumberRequest

final class UpdatePunterDetails(
    puntersRepository: PuntersRepository,
    puntersViewRepository: View01PatronDetailsRepository,
    excludedPlayersRepository: ExcludedPlayersRepository,
    punters: PuntersBoundedContext,
    bets: BetsBoundedContext)(implicit ec: ExecutionContext, clock: Clock) {

  private val selfExcludeAfterDataChange = new SelfExcludeAfterDataChange(excludedPlayersRepository, punters, bets)

  def updatePunterPhoneNumber(
      punterId: PunterId,
      newPhoneNumber: UpdatePunterPhoneNumberRequest): EitherT[Future, UpdatePunterProfileError, Unit] =
    for {
      _ <- updatePuntersRepository(
        punterId,
        _.copy(phoneNumber = newPhoneNumber.phoneNumber, isPhoneNumberVerified = false))
    } yield ()

  def updatePunterDetails(
      punterId: PunterId,
      newPersonalDetails: UpdatePunterDetailsRequest): EitherT[Future, UpdatePunterProfileError, Unit] =
    updatePuntersRepository(
      punterId,
      _.copy(
        name = newPersonalDetails.name,
        address = newPersonalDetails.address,
        phoneNumber = newPersonalDetails.phoneNumber)).map(_ => ())

  def updatePunterAddress(
      punterId: PunterId,
      newPersonalDetails: UpdatePunterAddressRequest): EitherT[Future, UpdatePunterProfileError, Unit] = {
    for {
      _ <- updatePuntersRepository(punterId, _.copy(address = newPersonalDetails.address))
    } yield ()
  }

  def updatePunterDateOfBirth(
      punterId: PunterId,
      newPersonalDetails: UpdatePunterDobRequest): EitherT[Future, UpdatePunterProfileError, Unit] = {
    for {
      _ <- updatePuntersRepository(punterId, _.copy(dateOfBirth = newPersonalDetails.dateOfBirth))
      punter <- puntersRepository.findByPunterId(punterId).toRight(UpdatePunterProfileError.PunterNotFound)
      _ <- punter.ssn.traverse { ssn =>
        selfExcludeAfterDataChange.maybeSelfExcludeBasedOnDGEImportedData(ssn, punter).leftMap {
          case SelfExcludeAfterDataChangeError.PunterNotFound =>
            UpdatePunterProfileError.PunterNotFound: UpdatePunterProfileError
        }
      }
    } yield ()
  }

  def updatePunterPersonalName(
      punterId: PunterId,
      newPersonalDetails: UpdatePunterPersonalNameRequest): EitherT[Future, UpdatePunterProfileError, Unit] = {
    for {
      _ <- updatePuntersRepository(punterId, _.copy(name = newPersonalDetails.personalName))
      punter <- puntersRepository.findByPunterId(punterId).toRight(UpdatePunterProfileError.PunterNotFound)
      _ <- punter.ssn.traverse { ssn =>
        selfExcludeAfterDataChange
          .maybeSelfExcludeBasedOnDGEImportedData(ssn, punter)
          .leftMap[UpdatePunterProfileError] {
            case SelfExcludeAfterDataChangeError.PunterNotFound =>
              UpdatePunterProfileError.PunterNotFound
          }
      }
    } yield ()
  }

  private def updatePuntersRepository(punterId: PunterId, detailsChange: PunterPersonalDetails => PunterPersonalDetails)
      : EitherT[Future, UpdatePunterProfileError, Unit] = {
    for {
      result <- puntersRepository.updateDetails(punterId, update = detailsChange).leftMap {
        case PuntersRepositoryErrors.PunterIdNotFound            => PunterNotFound
        case PuntersRepositoryErrors.PunterUsernameAlreadyExists => ConflictingData
        case PuntersRepositoryErrors.PunterEmailAlreadyExists    => ConflictingData
      }
      _ <- EitherT.right(puntersViewRepository.updateDetails(punterId, update = detailsChange))
    } yield result
  }
}

sealed trait UpdatePunterProfileError
object UpdatePunterProfileError {
  case object PunterNotFound extends UpdatePunterProfileError
  case object ConflictingData extends UpdatePunterProfileError
}
