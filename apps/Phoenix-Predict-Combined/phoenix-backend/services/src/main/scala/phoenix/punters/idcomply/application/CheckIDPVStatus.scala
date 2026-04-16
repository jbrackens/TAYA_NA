package phoenix.punters.idcomply.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.data.Validated
import cats.data.ValidatedNel
import cats.syntax.apply._
import cats.syntax.bifunctor._
import cats.syntax.flatMap._
import cats.syntax.traverse._
import cats.syntax.validated._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.pagination.Pagination
import phoenix.core.validation.Validation.Validation
import phoenix.core.validation.ValidationException
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteRepository
import phoenix.notes.domain.NoteText
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.Address
import phoenix.punters.domain.AddressLine
import phoenix.punters.domain.City
import phoenix.punters.domain.Country
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.DocumentNumber
import phoenix.punters.domain.FirstName
import phoenix.punters.domain.IdDocument
import phoenix.punters.domain.IdDocumentType
import phoenix.punters.domain.LastName
import phoenix.punters.domain.PersonalName
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.PuntersRepositoryErrors.PunterIdNotFoundInSettings
import phoenix.punters.domain.RegistrationOutcome
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain.Zipcode
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.application.CheckIDPVStatusError._
import phoenix.punters.idcomply.domain.Events.PunterFailedPhotoVerification
import phoenix.punters.idcomply.domain.Events.PunterPhotoVerificationTokenStatusWasChecked
import phoenix.punters.idcomply.domain.Events.PunterWasAskedForPhotoVerification
import phoenix.punters.idcomply.domain.IDPVTokenStatus
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.FullMatch
import phoenix.punters.idcomply.domain.IDPVTokenStatusResponse.IDPVUserFields
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.domain.TokenId
import phoenix.utils.UUIDGenerator

final class CheckIDPVStatus(
    puntersBoundedContext: PuntersBoundedContext,
    registrationEventRepository: RegistrationEventRepository,
    puntersRepository: PuntersRepository,
    idComplyService: IdComplyService,
    notesRepository: NoteRepository,
    excludedPlayersRepository: ExcludedPlayersRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock)(implicit ec: ExecutionContext) {

  private val checkDGEExclusion = new CheckDGEExclusion(excludedPlayersRepository)
  private val insertNotesUseCase = new InsertNotes(notesRepository, clock, uuidGenerator)
  private val log = LoggerFactory.getLogger(getClass)

  def checkIDPVStatus(punterId: PunterId): EitherT[Future, CheckIDPVStatusError, Unit] = {
    log.info(s"checkIDPVStatus: punterId=$punterId")
    val out = for {
      latestEvent <- EitherT.liftF(registrationEventRepository.latestEventForId(punterId))
      _ = log.info(s"checkIDPVStatus: punterId=$punterId event: $latestEvent")
      output <- latestEvent match {
        case Some(event: PunterWasAskedForPhotoVerification) =>
          log.info(s"checkIDPVStatus: punterId=$punterId handlePunter")
          handlePunterWasAskedForPhotoVerification(event)
        case _ =>
          EitherT.leftT[Future, Unit](PunterWasNotAskedForPhotoVerification).leftWiden[CheckIDPVStatusError]
      }
    } yield output
    out.value.foreach(v => log.info(s"checkIDPVStatus: punterId=$punterId output: $v"))
    out
  }

  private def handlePunterWasAskedForPhotoVerification(
      event: PunterWasAskedForPhotoVerification): EitherT[Future, CheckIDPVStatusError, Unit] =
    retrieveTokenStatusAndLogEvent(event.punterId, event.token).flatMap {
      case completed: IDPVTokenStatusResponse.Completed =>
        log.info(s"handlePunter: punterId=${event.punterId} completed: $completed")
        handleCompletedIDPV(event.punterId, completed)
      case IDPVTokenStatusResponse.Created | IDPVTokenStatusResponse.Activated | IDPVTokenStatusResponse.Archived =>
        log.info(s"handlePunter: punterId=${event.punterId} notCompleted")
        EitherT.leftT(IDPVNotCompleted)
    }

  private def retrieveTokenStatusAndLogEvent(
      punterId: PunterId,
      token: TokenId): EitherT[Future, CheckIDPVStatusError, IDPVTokenStatusResponse] = {
    EitherT.liftF {
      idComplyService.getIDPVTokenStatus(token).flatTap { tokenStatusResponse =>
        registrationEventRepository.save(
          PunterPhotoVerificationTokenStatusWasChecked(
            punterId,
            clock.currentOffsetDateTime(),
            IDPVTokenStatus.from(tokenStatusResponse)))
      }
    }
  }

  private def handleCompletedIDPV(
      punterId: PunterId,
      completed: IDPVTokenStatusResponse.Completed): EitherT[Future, CheckIDPVStatusError, Unit] = {
    completed match {
      case fullMatch: IDPVTokenStatusResponse.FullMatch => handleFullMatch(punterId, fullMatch)
      case IDPVTokenStatusResponse.PartialMatch | IDPVTokenStatusResponse.FailMatch =>
        handleNotMatchedCorrectly(punterId)
    }
  }

  private[application] def checkCorrectnessAndRecord(
      punterId: PunterId,
      registeredUser: Punter,
      correctedData: CorrectedUserDetails): EitherT[Future, CheckIDPVStatusError, Unit] = {
    checkIDPVDataCorrectness(punterId, registeredUser, correctedData).leftFlatMap { registrationIssue =>
      val statusErrorAfterReportingIssue = EitherT.liftF[Future, Unit, CheckIDPVStatusError](
        recordFailedRegistration(punterId, registrationIssue).value.map(_ =>
          CheckIDPVStatusError.PunterRegistrationFailed))
      statusErrorAfterReportingIssue.swap
    }
  }

  private[application] def handleFullMatch(
      punterId: PunterId,
      fullMatch: IDPVTokenStatusResponse.FullMatch): EitherT[Future, CheckIDPVStatusError, Unit] = {
    log.info(s"handleFullMatch: $fullMatch")
    for {
      correctedData <- parseCorrectedUserDetails(fullMatch)
      _ = log.info(s"handleFullMatch: punterId=$punterId parseCorrectedUserDetails OK. Corrected data: $correctedData")
      registeredUser <- findRegisteredUser(punterId)
      _ = log.info(s"handleFullMatch: punterId=$punterId findRegisteredUser OK")
      _ <- checkCorrectnessAndRecord(punterId, registeredUser, correctedData)
      _ = log.info(s"handleFullMatch: punterId=$punterId checkIDPVDataCorrectness OK")
      _ <- updatePersonalDetails(punterId, correctedData)
      _ = log.info(s"handleFullMatch: punterId=$punterId updatePersonalDetails OK")
      _ <- confirmSuccessfulRegistration(punterId)
      _ = log.info(s"handleFullMatch: punterId=$punterId confirmSuccessfulRegistration OK")
    } yield ()
  }

  private def handleNotMatchedCorrectly(punterId: PunterId): EitherT[Future, CheckIDPVStatusError, Unit] =
    for {
      _ <- recordFailedRegistration(punterId, RegistrationIssue.RegistrationDataMismatch)
      _ <- EitherT.liftF(
        registrationEventRepository.save(PunterFailedPhotoVerification(punterId, clock.currentOffsetDateTime())))
      _ <- EitherT.leftT[Future, Unit](PunterRegistrationFailed).leftWiden[CheckIDPVStatusError]
    } yield ()

  private def findRegisteredUser(punterId: PunterId): EitherT[Future, CheckIDPVStatusError, Punter] = {
    puntersRepository.findByPunterId(punterId).toRight(CheckIDPVStatusError.PunterNotFound)
  }

  private def checkIDPVDataCorrectness(
      punterId: PunterId,
      punter: Punter,
      correctedData: CorrectedUserDetails): EitherT[Future, RegistrationIssue, Unit] = {
    log.info(s"checkIDPVDataCorrectness: punterId=$punterId correctedData: $correctedData")

    val result = for {
      _ <- checkIfDetailsMatch(punter, correctedData)
      _ = log.info(s"checkIfExcluded punterId=$punterId")
      _ <- checkIfExcluded(correctedData)
      _ = log.info(s"ensureUniqueSSN punterId=$punterId")
      _ <- ensureUniqueSSN(punterId, correctedData)
    } yield ()
    result.value.foreach(v => log.info(s"checkIDPVDataCorrectness: punterId=$punterId result: $v"))
    result
  }

  private def recordFailedRegistration(
      punterId: PunterId,
      registrationIssue: RegistrationIssue): EitherT[Future, CheckIDPVStatusError, Unit] = {
    val out = for {
      _ <-
        puntersBoundedContext
          .suspend(punterId, registrationIssue, clock.currentOffsetDateTime())
          .leftMap[CheckIDPVStatusError] { err =>
            log.error(s"recordFailedRegistration: punterId=$punterId cannot be suspended: $err")
            CheckIDPVStatusError.PunterSuspensionError
          }
      _ = log.info(s"recordFailedRegistration: punterId=$punterId punter suspended")
      _ <- EitherT.liftF(insertNotesUseCase.insertSystemNote(punterId, NoteText.suspendedNote(registrationIssue)))
      _ = notesRepository.searchAll(punterId, Pagination(1, 1)).map(v => log.info(s"NOTE: ${v}"))
      _ = log.info(s"recordFailedRegistration: punterId=$punterId punter noted")
      _ <-
        puntersRepository
          .markRegistrationFinished(punterId, RegistrationOutcome.Failed, clock.currentOffsetDateTime())
          .leftMap[CheckIDPVStatusError] { (_: PuntersRepositoryErrors.PunterIdNotFound.type) =>
            log.error(s"recordFailedRegistration: punterId=$punterId not found")
            CheckIDPVStatusError.PunterNotFound
          }
    } yield ()
    out.value.foreach(e => log.info(s"recordFailedRegistration: punter=$punterId reason: $e"))
    out
  }

  private def updatePersonalDetails(
      punterId: PunterId,
      correctedDetails: CorrectedUserDetails): EitherT[Future, CheckIDPVStatusError, Unit] =
    puntersRepository
      .updateDetails(punterId, details => correctedDetails.correctExisting(details))
      .leftMap[CheckIDPVStatusError] {
        case PuntersRepositoryErrors.PunterUsernameAlreadyExists => CheckIDPVStatusError.PunterRegistrationFailed
        case PuntersRepositoryErrors.PunterEmailAlreadyExists    => CheckIDPVStatusError.PunterRegistrationFailed
        case PuntersRepositoryErrors.PunterIdNotFound            => CheckIDPVStatusError.PunterNotFound
      }

  private[application] def checkIfDetailsMatch(
      punter: Punter,
      correctedData: CorrectedUserDetails): EitherT[Future, RegistrationIssue, Unit] = {

    EitherT
      .fromEither[Future](ComparePunterData.checkDetailsValidate(punter, correctedData).toEither)
      .leftMap { errors =>
        log.info(s"checkIfDetailsMatch: punterId=${punter.punterId} not matching: ${errors.toList.mkString(",")}")
        RegistrationIssue.RegistrationDataMismatch
      }
      .semiflatTap { _ =>
        Future.successful(log.info(s"checkIfDetailsMatch: punterId=${punter.punterId} match ok"))
      }
  }

  private def checkIfExcluded(correctedData: CorrectedUserDetails): EitherT[Future, RegistrationIssue, Unit] =
    checkDGEExclusion
      .checkAgainstExcludedPlayers(correctedData.ssn, correctedData.lastName, correctedData.dateOfBirth)
      .leftMap(_ => RegistrationIssue.UserIsSelfExcluded)

  private def ensureUniqueSSN(
      punterId: PunterId,
      correctedData: CorrectedUserDetails): EitherT[Future, RegistrationIssue, Unit] =
    for {
      _ <- puntersRepository.setSSN(punterId, correctedData.ssn).leftFlatMap[Unit, RegistrationIssue] {
        case PuntersRepositoryErrors.SSNAlreadyExists =>
          EitherT.leftT(RegistrationIssue.DuplicatedSSN)

        case PuntersRepositoryErrors.PunterIdNotFound =>
          EitherT.liftF(Future.failed(UnexpectedIDPVError.missingPunterData()))
      }
    } yield ()

  private def parseCorrectedUserDetails(
      idpvMatch: FullMatch): EitherT[Future, CannotVerifyPunter.type, CorrectedUserDetails] =
    EitherT.fromEither(CorrectedUserDetails.from(idpvMatch).toEither.leftMap(_ => CannotVerifyPunter))

  private def confirmSuccessfulRegistration(punterId: PunterId): EitherT[Future, CheckIDPVStatusError, Unit] =
    for {
      _ <-
        puntersRepository
          .updateSettings(punterId, _.copy(isRegistrationVerified = true))
          .leftMap[CheckIDPVStatusError] {
            case PunterIdNotFoundInSettings => CheckIDPVStatusError.PunterNotFound
          }
      _ <-
        puntersBoundedContext
          .verifyPunter(punterId, ActivationPath.IDPV)
          .leftMap[CheckIDPVStatusError](_ => CheckIDPVStatusError.PunterNotFound)
          .flatMap(_ =>
            EitherT.liftF[Future, CheckIDPVStatusError, Unit](
              insertNotesUseCase.insertSystemNote(punterId, NoteText.activeNote("IDPV"))))
      _ <-
        puntersRepository
          .markRegistrationFinished(punterId, RegistrationOutcome.Successful, clock.currentOffsetDateTime())
          .leftMap[CheckIDPVStatusError](_ => CheckIDPVStatusError.PunterNotFound)
    } yield ()
}

private final case class CorrectedUserDetails(
    firstName: Option[FirstName],
    lastName: LastName,
    ssn: FullSSN,
    dateOfBirth: DateOfBirth,
    address: Option[AddressLine],
    city: Option[City],
    zipcode: Option[Zipcode],
    country: Option[Country],
    document: IdDocument) {

  def correctExisting(existing: PunterPersonalDetails): PunterPersonalDetails =
    existing.copy(
      name = correctName(existing.name),
      address = correctAddress(existing.address),
      dateOfBirth = this.dateOfBirth,
      document = Some(document))

  private def correctName(existingName: PersonalName): PersonalName =
    existingName.copy(firstName = this.firstName.getOrElse(existingName.firstName), lastName = this.lastName)

  private def correctAddress(existingAddress: Address): Address =
    existingAddress.copy(
      addressLine = this.address.getOrElse(existingAddress.addressLine),
      city = this.city.getOrElse(existingAddress.city),
      zipcode = this.zipcode.getOrElse(existingAddress.zipcode),
      country = this.country.getOrElse(existingAddress.country))
}

private object CorrectedUserDetails {

  def from(idpvMatch: FullMatch): Validation[CorrectedUserDetails] = {
    val firstName = idpvMatch.firstName.traverse(firstName => FirstName.apply(firstName.value))
    val lastName = LastName.apply(idpvMatch.lastName.value)
    val ssn = FullSSN.fromString(idpvMatch.ssn.value)
    val dateOfBirth = DateOfBirth.from(idpvMatch.dobDay.value, idpvMatch.dobMonth.value, idpvMatch.dobYear.value)
    val address = idpvMatch.address.traverse(address => AddressLine.apply(address.value))
    val city = idpvMatch.city.traverse(city => City.apply(city.value))
    val zipcode = idpvMatch.zip.traverse(zip => Zipcode.apply(zip.value))
    val country = idpvMatch.country.traverse(country => Country.apply(country.value))
    val documentType = IdTypeToDocumentTypeMapper.idDocumentType(idpvMatch.idType)
    val documentNumber = DocumentNumber.fromString(idpvMatch.idNumber.value)
    val document = (documentType, documentNumber).mapN(IdDocument)
    (firstName, lastName, ssn, dateOfBirth, address, city, zipcode, country, document).mapN(CorrectedUserDetails.apply)
  }
}

private object ComparePunterData {
  type MatchError = String
  def checkDetailsValidate(punter: Punter, correctedData: CorrectedUserDetails): ValidatedNel[MatchError, Unit] = {

    def validateEquals[T](left: T, right: T, errorPrefix: String) = {
      Validated.condNel(left == right, (), s"$errorPrefix is different: $left <> $right")
    }

    val last4DigitsOfSSN = punter.ssn.fold(last4 => last4, ssn => ssn.last4Digits)
    validateEquals(punter.details.dateOfBirth, correctedData.dateOfBirth, "date of birth")
      .combine(validateEquals(punter.details.name.lastName.normalized, correctedData.lastName.normalized, "lastName"))
      .combine(validateEquals(last4DigitsOfSSN, correctedData.ssn.last4Digits, "ssn"))
  }
}

sealed trait CheckIDPVStatusError
object CheckIDPVStatusError {
  case object PunterWasNotAskedForPhotoVerification extends CheckIDPVStatusError
  case object IDPVNotCompleted extends CheckIDPVStatusError
  case object CannotVerifyPunter extends CheckIDPVStatusError
  case object PunterNotFound extends CheckIDPVStatusError
  case object PunterSuspensionError extends CheckIDPVStatusError
  case object PunterRegistrationFailed extends CheckIDPVStatusError
}
final case class UnexpectedIDPVError(cause: String) extends RuntimeException(cause)
object UnexpectedIDPVError {
  def missingPunterData(): UnexpectedIDPVError = UnexpectedIDPVError("Missing punter data")
}

object IdTypeToDocumentTypeMapper {
  def idDocumentType(idType: IDPVUserFields.IdType): Validation[IdDocumentType] =
    idType.value match {
      case "passport"        => IdDocumentType.Passport.validNel
      case "idCard"          => IdDocumentType.IdCard.validNel
      case "drivingLicense"  => IdDocumentType.DrivingLicense.validNel
      case "residencePermit" => IdDocumentType.ResidencePermit.validNel
      case _                 => ValidationException("Unknown document received in IDPV match").invalidNel
    }
}
