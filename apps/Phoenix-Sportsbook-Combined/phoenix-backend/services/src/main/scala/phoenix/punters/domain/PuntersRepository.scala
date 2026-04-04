package phoenix.punters.domain

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source
import cats.data.EitherT
import cats.data.OptionT
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.pagination.PaginatedResult
import phoenix.core.pagination.Pagination
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.domain.PuntersRepositoryErrors.ChangePunterDetailsError
import phoenix.punters.domain.PuntersRepositoryErrors.ChangePunterSettingsError
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFound
import phoenix.punters.domain.PuntersRepositoryErrors.RecordPunterError
import phoenix.punters.domain.PuntersRepositoryErrors.SetSSNError
import phoenix.punters.domain.SocialSecurityNumber.FullOrPartialSSN
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.exclusion.domain.NormalizedLastName

trait PuntersRepository {
  def startPunterRegistration(punter: Punter, startedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit]

  def markRegistrationFinished(
      punterId: PunterId,
      outcome: RegistrationOutcome,
      finishedAt: OffsetDateTime): EitherT[Future, PunterIdNotFound.type, Unit]

  def getRegisteredAt(punterId: PunterId): Future[Option[OffsetDateTime]]

  def register(punter: Punter, finishedAt: OffsetDateTime): EitherT[Future, RecordPunterError, Unit]

  def setSSN(punterId: PunterId, ssn: FullSSN): EitherT[Future, SetSSNError, Unit]

  def updateDetails(
      punterId: PunterId,
      update: PunterPersonalDetails => PunterPersonalDetails): EitherT[Future, ChangePunterDetailsError, Unit]

  def updateSettings(
      punterId: PunterId,
      update: PunterSettings => PunterSettings): EitherT[Future, ChangePunterSettingsError, Unit]

  def delete(punterId: PunterId): Future[Unit]

  def deleteSSN(
      punterId: PunterId): Future[
    Int
  ] // TODO (PHXD-2996): should be safe to remove this method when punter records are in sync with punter_ssns table

  def countPuntersWithStartedRegistration(): Future[Int]

  def findByPunterId(punterId: PunterId): OptionT[Future, Punter]

  def findExcludedPunters(search: SelfExcludedPunterSearch): OptionT[Future, (Punter, SearchConfidence)]

  def findPuntersByFilters(search: PunterSearch, pagination: Pagination): Future[PaginatedResult[Punter]]

  def findFirstPunterByFilters(search: PunterSearch)(implicit ec: ExecutionContext): Future[Option[Punter]] = {
    findPuntersByFilters(search, Pagination.one()).map(_.data.headOption)
  }

  def getConfirmedPunters(): Source[Punter, NotUsed]
}

sealed trait RegistrationOutcome extends EnumEntry with UpperSnakecase
object RegistrationOutcome extends Enum[RegistrationOutcome] {
  override def values: IndexedSeq[RegistrationOutcome] = findValues

  final case object Successful extends RegistrationOutcome
  final case object Failed extends RegistrationOutcome
}

object PuntersRepositoryErrors {
  sealed trait RecordPunterError
  sealed trait ChangePunterDetailsError
  sealed trait ChangePunterSettingsError
  sealed trait SetSSNError

  case object PunterIdAlreadyExists extends RecordPunterError
  case object PunterUsernameAlreadyExists extends RecordPunterError with ChangePunterDetailsError
  case object PunterEmailAlreadyExists extends RecordPunterError with ChangePunterDetailsError
  case object PunterIdNotFound extends ChangePunterDetailsError with SetSSNError
  case object PunterIdNotFoundInSettings extends ChangePunterSettingsError
  case object SSNAlreadyExists extends RecordPunterError with SetSSNError
}

final case class Punter(
    punterId: PunterId,
    details: PunterPersonalDetails,
    ssn: FullOrPartialSSN,
    settings: PunterSettings)
final case class PunterPersonalDetails(
    userName: Username,
    name: PersonalName,
    email: Email,
    phoneNumber: MobilePhoneNumber,
    address: Address,
    dateOfBirth: DateOfBirth,
    gender: Option[Gender],
    isTestAccount: Boolean,
    document: Option[IdDocument],
    isPhoneNumberVerified: Boolean)

final case class PunterSettings(
    lastSignIn: Option[LastSignInData],
    userPreferences: UserPreferences,
    termsAgreement: TermsAgreement,
    signUpDate: OffsetDateTime,
    isRegistrationVerified: Boolean,
    isAccountVerified: Boolean,
    mfaEnabled: Boolean)

final case class PunterSearch(
    punterId: Option[PunterId] = None,
    firstName: Option[FirstName] = None,
    lastName: Option[LastName] = None,
    dateOfBirth: Option[DateOfBirth] = None,
    email: Option[Email] = None,
    username: Option[Username] = None)
final case class SelfExcludedPunterSearch(
    ssn: Option[Either[Last4DigitsOfSSN, FullSSN]],
    name: NormalizedLastName,
    dateOfBirth: DateOfBirth)
sealed trait SearchConfidence
object SearchConfidence {
  case object ExactMatch extends SearchConfidence
  case object CloseMatch extends SearchConfidence
}
