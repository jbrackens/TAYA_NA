package phoenix.punters.idcomply.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.bifunctor._
import io.scalaland.chimney.dsl._
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.validation.Validation._
import phoenix.http.core.IpAddress
import phoenix.notes.application.InsertNotes
import phoenix.notes.domain.NoteRepository
import phoenix.notes.domain.NoteText
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileAlreadyExists
import phoenix.punters.PuntersBoundedContext.SuspendPunterError
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.SocialSecurityNumber.FullSSN
import phoenix.punters.domain.SuspensionEntity.Deceased
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain._
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.application.RegistrationSignUp._
import phoenix.punters.idcomply.domain.CreateIDPVToken.CreateIDPVTokenWrongRequest
import phoenix.punters.idcomply.domain.Events.KYCResultEventData
import phoenix.punters.idcomply.domain.Events.PunterGotFailMatchQuestionsResponse
import phoenix.punters.idcomply.domain.Events.PunterGotFailedKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterGotSuccessfulKYCResponse
import phoenix.punters.idcomply.domain.Events.PunterSignUpStarted
import phoenix.punters.idcomply.domain.Events.PunterWasAskedQuestions
import phoenix.punters.idcomply.domain.Events.SignUpEventData
import phoenix.punters.idcomply.domain.GetKBAQuestions._
import phoenix.punters.idcomply.domain.RequestKYC._
import phoenix.punters.idcomply.domain.UserFields
import phoenix.punters.idcomply.domain._
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SignUpRequest
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletAlreadyExistsError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class RegistrationSignUp(
    registrationEventRepository: RegistrationEventRepository,
    puntersBoundedContext: PuntersBoundedContext,
    walletsBoundedContext: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    idComplyService: IdComplyService,
    notesRepository: NoteRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    excludedPlayersRepository: ExcludedPlayersRepository,
    deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock,
    puntersDomainConfig: PuntersDomainConfig)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  private val requestIDPVFlow = new RequestIDPVProcess(idComplyService, registrationEventRepository, clock)
  private val checkDGEExclusion = new CheckDGEExclusion(excludedPlayersRepository)
  private val registrationDataCleaner =
    new RegistrationDataCleaner(authenticationRepository, puntersRepository)
  private val insertNotesUseCase = new InsertNotes(notesRepository, clock, uuidGenerator)

  def registrationSignUp(
      signUpData: SignUpRequest,
      clientIP: Option[IpAddress]): EitherT[Future, RegistrationRequestError, RegistrationResponse] = {
    val now = clock.currentOffsetDateTime()
    for {
      _ <- enforceMaximumAmountOfPunters()
      _ <- enforceAgeRestriction(signUpData.dateOfBirth, now)
      _ <- validateUsername(signUpData.username)
      _ <- checkUsernameAndEmailNotAlreadyRegistered(signUpData.username, signUpData.email)
      punterId <- registerInIdentityProvider(signUpData)
      terms <- EitherT.liftF(termsAndConditionsRepository.getCurrentTerms())
      _ <- registerPunterDetails(punterId, signUpData, terms, now)
      _ <- EitherT.liftF(
        registrationEventRepository.save(PunterSignUpStarted(punterId, now, signUpData.transformInto[SignUpEventData])))
      kycResult <- requestKYC(punterId, signUpData)
        .leftSemiflatTap(_ => registrationDataCleaner.cleanUp(punterId))
        .leftWiden[RegistrationRequestError]
      _ <- EitherT.liftF(createPunterInUnverifiedState(punterId, signUpData.referralCode))
      _ <- EitherT.liftF(
        deviceFingerprintsRepository.insert(punterId, signUpData.deviceFingerprint.getOrElse(DeviceFingerprint.empty)))
      response <- decideNextStep(punterId, signUpData, KYCResultStatus(kycResult, formattedAlerts), clientIP)
    } yield response
  }

  private def enforceMaximumAmountOfPunters(): EitherT[Future, MaximumAmountOfPuntersCheckNotPassed.type, Unit] =
    EitherT {
      puntersRepository.countPuntersWithStartedRegistration().map { amount =>
        Either.cond(amount < puntersDomainConfig.maximumAmountOfPunters.value, (), MaximumAmountOfPuntersCheckNotPassed)
      }
    }

  private def registerPunterDetails(
      punterId: PunterId,
      signUpRequest: SignUpRequest,
      terms: Terms,
      now: OffsetDateTime): EitherT[Future, RegistrationRequestError, Unit] = {
    val punterDetails = PunterPersonalDetails(
      signUpRequest.username,
      signUpRequest.name,
      signUpRequest.email,
      signUpRequest.phoneNumber,
      signUpRequest.address,
      signUpRequest.dateOfBirth,
      signUpRequest.gender,
      isTestAccount = false,
      document = None,
      isPhoneNumberVerified = true)
    val punter = Punter(
      punterId,
      punterDetails,
      ssn = Left(signUpRequest.ssn),
      PunterSettings(
        None,
        UserPreferences.default,
        TermsAgreement(TermsAcceptedVersion.fromCurrent(terms.currentTermsVersion), clock.currentOffsetDateTime()),
        now,
        isRegistrationVerified = false,
        isAccountVerified = false,
        mfaEnabled = puntersDomainConfig.mfa.enabledByDefault))

    puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()).leftMap {
      case PuntersRepositoryErrors.PunterIdAlreadyExists       => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.PunterUsernameAlreadyExists => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.PunterEmailAlreadyExists    => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.SSNAlreadyExists            => RegistrationSignUp.DuplicateSSN
    }
  }

  private def markRegistrationFailed(punterId: PunterId): EitherT[Future, RegistrationSignUpException, Unit] =
    puntersRepository
      .markRegistrationFinished(punterId, RegistrationOutcome.Failed, clock.currentOffsetDateTime())
      .leftMap((_: PuntersRepositoryErrors.PunterIdNotFound.type) => RegistrationSignUp.MissingPunterData())

  private def checkUsernameAndEmailNotAlreadyRegistered(
      username: Username,
      email: Email): EitherT[Future, ConflictingPunterInformation.type, Unit] = {

    val lookupByUsername = EitherT
      .right(
        authenticationRepository.userExists(UserLookupId.byUsername(username))
      ) // TODO (PHXD-2060): check also in db?
      .ensure(ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    val lookupByEmail = EitherT
      .right(authenticationRepository.userExists(UserLookupId.byEmail(email)))
      .ensure(ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    for {
      _ <- lookupByUsername
      _ <- lookupByEmail
    } yield ()
  }

  private def enforceAgeRestriction(
      dateOfBirth: DateOfBirth,
      now: OffsetDateTime): EitherT[Future, AgeRestrictionNotPassed.type, Unit] =
    EitherT.cond(AgeRestrictionEnforcement.passesAgeRestrictionCheck(dateOfBirth, now), (), AgeRestrictionNotPassed)

  private def validateUsername(username: Username): EitherT[Future, ForbiddenCharactersInUsername.type, Unit] =
    EitherT.cond(!username.value.contains("@"), (), ForbiddenCharactersInUsername)

  private def registerInIdentityProvider(
      signUpData: SignUpRequest): EitherT[Future, RegistrationRequestError, PunterId] =
    for {
      validPassword <-
        ValidPassword
          .from(signUpData.password)
          .toEitherTCombined[Future]
          .leftMap(_ => RegistrationSignUp.WrongPasswordFormat)
      punterId <- EitherT.right(authenticationRepository.register(userDetails(signUpData), validPassword))
    } yield punterId

  private def requestKYC(
      punterId: PunterId,
      signUpRequest: SignUpRequest): EitherT[Future, RegistrationRequestError, KYCResult] =
    idComplyService
      .requestKYC(userFields(punterId, signUpRequest))
      .semiflatTap { kycResult =>
        for {
          _ <- addNoteOnKYCResponse(punterId, kycResult)
          _ <- registrationEventRepository.save(
            PunterGotSuccessfulKYCResponse(
              punterId,
              clock.currentOffsetDateTime(),
              KYCResultEventData.fromKYCResult(kycResult)))
        } yield ()
      }
      .leftSemiflatTap(kycError =>
        registrationEventRepository.save(PunterGotFailedKYCResponse(punterId, clock.currentOffsetDateTime(), kycError)))
      .leftMap { case KYCError.WrongRequest(error) => KYCWrongRequest(error.key) }

  private def userFields(punterId: PunterId, signUpRequest: SignUpRequest): UserFields =
    UserFields(
      userId = punterId,
      firstName = UserFields.FirstName(signUpRequest.name.firstName.value),
      lastName = UserFields.LastName(signUpRequest.name.lastName.value),
      buildingName = UserFields.BuildingName(signUpRequest.address.addressLine.value),
      city = UserFields.City(signUpRequest.address.city.value),
      state = UserFields.State(signUpRequest.address.state.value),
      zip = UserFields.ZipCode(signUpRequest.address.zipcode.value),
      country = UserFields.Country(signUpRequest.address.country.value),
      dobDay = UserFields.DateOfBirthDay(signUpRequest.dateOfBirth.day),
      dobMonth = UserFields.DateOfBirthMonth(signUpRequest.dateOfBirth.month),
      dobYear = UserFields.DateOfBirthYear(signUpRequest.dateOfBirth.year),
      ssn = UserFields.LastFourDigitsOfSocialSecurityNumber(signUpRequest.ssn.value))

  private def kycKbaAlertsNoteText(alerts: List[Alert], details: List[Detail]): NoteText = {
    val alertsStr = formattedAlerts(alerts)
    val detailsStr =
      details.map(detail => s"{key: ${detail.field.value}, message: ${detail.message.value}}").mkString("[", ",", "]")
    NoteText.unsafe(s"Alerts in KYC/KBA process: Alerts: $alertsStr, Details: $detailsStr")
  }
  private def addNoteOnKYCResponse(punterId: PunterId, kycResult: KYCResult): Future[Unit] = {
    if (kycResult.alerts.nonEmpty)
      insertNotesUseCase.insertSystemNote(punterId, kycKbaAlertsNoteText(kycResult.alerts, kycResult.details))
    else Future.unit
  }

  private def registrationFailed(punterId: PunterId, suspensionEntity: SuspensionEntity): Future[Unit] = {
    for {
      _ <-
        puntersBoundedContext
          .suspend(punterId, suspensionEntity, suspendedAt = clock.currentOffsetDateTime())
          .leftMap(PunterSuspensionErrorRightAfterCreationException)
      suspensionDetails = suspensionEntity match {
        case issue: SuspensionEntity.RegistrationIssue => issue.details
        case op: SuspensionEntity.OperatorSuspend      => op.details
        case nb: SuspensionEntity.NegativeBalance      => nb.details
        case deceased: SuspensionEntity.Deceased       => deceased.details
      }
      _ <-
        EitherT
          .liftF(insertNotesUseCase.insertSystemNote(punterId, NoteText.suspendedNote(suspensionDetails)))
          .leftMap(PunterSuspensionErrorRightAfterCreationException)
      _ <- markRegistrationFailed(punterId)
    } yield ()
  }.rethrowT

  private def createPunterInUnverifiedState(punterId: PunterId, referralCode: Option[ReferralCode]): Future[Unit] =
    for {
      _ <-
        puntersBoundedContext
          .createUnverifiedPunterProfile(
            punterId,
            depositLimits = Limits.none,
            stakeLimits = Limits.none,
            sessionLimits = Limits.none,
            referralCode,
            isTestAccount = false)
          .leftMap(AlreadyExistingPunterOnCreationException)
          .rethrowT
      _ <-
        walletsBoundedContext
          .createWallet(WalletId.deriveFrom(punterId))
          .leftMap(AlreadyExistingWalletOnCreationException)
          .rethrowT
    } yield ()

  private def formattedAlerts(alerts: Seq[Alert]) =
    alerts.map(alert => s"{key: ${alert.key.value}, message: ${alert.message.value}}").mkString("[", ",", "]")

  private def decideNextStep(
      punterId: PunterId,
      signUpRequest: SignUpRequest,
      kycStatus: KYCResultStatus,
      clientIP: Option[IpAddress]): EitherT[Future, RegistrationRequestError, RegistrationResponse] =
    kycStatus match {
      case KYCResultStatus.Deceased(note) =>
        log.info(s"Registration failed due to Deceased: punterId=$punterId")
        EitherT
          .liftF(registrationFailed(punterId, Deceased(clientIP, None, note.value)))
          .flatMap(_ => EitherT.leftT[Future, RegistrationResponse](KYCMatchingFailed))
      case KYCResultStatus.Suspend(note) =>
        log.info(s"Registration failed due to '$note': punterId=$punterId")
        EitherT
          .liftF(registrationFailed(punterId, RegistrationIssue(note.value)))
          .flatMap(_ => EitherT.leftT[Future, RegistrationResponse](KYCMatchingFailed))
      case KYCResultStatus.ForceIDPV(note) =>
        EitherT
          .liftF(insertNotesUseCase.insertSystemNote(punterId, note))
          .flatMap(_ => requestIDPV(punterId).leftWiden[RegistrationRequestError])
      case KYCResultStatus.Comply(transactionId, firstFiveDigitsSSN) =>
        val fullSSN = FullSSN.from(firstFiveDigitsSSN, signUpRequest.ssn)
        for {
          _ <- recordSSNEnforcingUniqueness(punterId, fullSSN).leftSemiflatTap(_ =>
            registrationFailed(punterId, RegistrationIssue.DuplicatedSSN))
          _ <- enforceNotExcludedFromGambling(fullSSN, signUpRequest).leftSemiflatTap(_ =>
            registrationFailed(punterId, RegistrationIssue.ExcludedFromGambling))
          kbaResult <- requestKBA(punterId, transactionId, signUpRequest)
            .leftSemiflatTap(_ => registrationFailed(punterId, RegistrationIssue.KBAInitialProcessFailed))
            .leftWiden[RegistrationRequestError]
          registrationResponse <- kbaResult match {
            case KBAQuestionsResult.FullMatch(_, questions) =>
              EitherT.safeRightT[Future, RegistrationRequestError](
                AskKnowledgeBasedAuthenticationQuestions(punterId, questions))
            case KBAQuestionsResult.FailMatch(_) =>
              requestIDPV(punterId).leftWiden[RegistrationRequestError]
          }
        } yield registrationResponse
    }

  private def requestIDPV(punterId: PunterId): EitherT[Future, IDPVFailed, RegistrationResponse] =
    requestIDPVFlow
      .requestIDPV(punterId)
      .leftSemiflatTap(_ => registrationFailed(punterId, RegistrationIssue.IDPVRequestFailed))
      .bimap(IDPVFailed, RequireIdPhotoVerification)

  private def requestKBA(
      punterId: PunterId,
      transactionId: TransactionId,
      signUpRequest: SignUpRequest): EitherT[Future, KBAFailed, KBAQuestionsResult] =
    idComplyService
      .getKBAQuestions(transactionId, userFields(punterId, signUpRequest))
      .semiflatTap {
        case KBAQuestionsResult.FullMatch(transactionId, questions) =>
          registrationEventRepository.save(
            PunterWasAskedQuestions(punterId, clock.currentOffsetDateTime(), transactionId, questions))
        case kbaResult: KBAQuestionsResult.FailMatch =>
          registrationEventRepository.save(
            PunterGotFailMatchQuestionsResponse(punterId, clock.currentOffsetDateTime(), kbaResult.message))
      }
      .leftMap(KBAFailed)

  private def recordSSNEnforcingUniqueness(
      punterId: PunterId,
      ssn: FullSSN): EitherT[Future, RegistrationRequestError, Unit] =
    for {
      _ <- puntersRepository.setSSN(punterId, ssn).leftFlatMap[Unit, RegistrationRequestError] {
        case PuntersRepositoryErrors.SSNAlreadyExists =>
          EitherT.leftT(DuplicateSSN)

        case PuntersRepositoryErrors.PunterIdNotFound =>
          EitherT.liftF(Future.failed(RegistrationSignUp.MissingPunterData()))
      }
    } yield ()

  private def enforceNotExcludedFromGambling(
      ssn: FullSSN,
      signUpRequest: SignUpRequest): EitherT[Future, RegistrationRequestError, Unit] =
    checkDGEExclusion
      .checkAgainstExcludedPlayers(ssn, signUpRequest.name.lastName, signUpRequest.dateOfBirth)
      .leftMap(_ => PlayerExcludedFromGambling)

  private def userDetails(signUpData: SignUpRequest): UserDetailsKeycloak = {

    UserDetailsKeycloak(userName = signUpData.username, email = signUpData.email, isEmailVerified = false)
  }
}

sealed trait RegistrationResponse

final case class AskKnowledgeBasedAuthenticationQuestions(punterId: PunterId, questions: List[Question])
    extends RegistrationResponse
final case class RequireIdPhotoVerification(idpvRedirectUrl: IDPVUrl) extends RegistrationResponse

final case class MaximumAmountOfPunters(value: Int)

object RegistrationSignUp {

  sealed trait RegistrationRequestError
  final case object MaximumAmountOfPuntersCheckNotPassed extends RegistrationRequestError
  final case object AgeRestrictionNotPassed extends RegistrationRequestError
  final case object ForbiddenCharactersInUsername extends RegistrationRequestError
  final case object WrongPasswordFormat extends RegistrationRequestError
  final case object ConflictingPunterInformation extends RegistrationRequestError
  final case object DuplicateSSN extends RegistrationRequestError
  final case object PlayerExcludedFromGambling extends RegistrationRequestError
  final case class KYCWrongRequest(key: KYCErrorKey) extends RegistrationRequestError
  final case object KYCMatchingFailed extends RegistrationRequestError
  final case class KBAFailed(error: GetKBAQuestionsWrongRequest.type) extends RegistrationRequestError
  final case class IDPVFailed(error: CreateIDPVTokenWrongRequest.type) extends RegistrationRequestError

  sealed abstract class RegistrationSignUpException(reason: String) extends Exception(reason)
  final case class AlreadyExistingPunterOnCreationException(error: PunterProfileAlreadyExists)
      extends RegistrationSignUpException(s"already_existing_punter_on_creation - error:$error ")
  final case class PunterSuspensionErrorRightAfterCreationException(error: SuspendPunterError)
      extends RegistrationSignUpException(s"punter_suspension_error_right_after_creation - error:$error ")
  final case class AlreadyExistingWalletOnCreationException(error: WalletAlreadyExistsError)
      extends RegistrationSignUpException(s"already_existing_wallet_on_creation - error:$error ")
  final case class MissingPunterData() extends RegistrationSignUpException("missing_punter_data")
  final case class UnexpectedRegistrationError(reason: String) extends RegistrationSignUpException(reason)
}
