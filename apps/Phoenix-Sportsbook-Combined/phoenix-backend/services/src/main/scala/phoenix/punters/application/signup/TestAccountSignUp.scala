package phoenix.punters.application.signup

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.instances.future._
import cats.syntax.bifunctor._
import net.logstash.logback.argument.StructuredArguments.kv
import org.slf4j.LoggerFactory

import phoenix.core.Clock
import phoenix.core.ScalaObjectUtils._
import phoenix.core.validation.Validation._
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterProtocol.ReferralCode
import phoenix.punters.PunterState.ActivationPath
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileAlreadyExists
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Limits
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PunterProfile
import phoenix.punters.domain.PunterSettings
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.Terms
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.UserDetailsKeycloak
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword
import phoenix.punters.idcomply.application.AgeRestrictionEnforcement
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.TestAccountSignUpRequest
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletAlreadyExistsError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId

final class TestAccountSignUp(
    clock: Clock,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    puntersBoundedContext: PuntersBoundedContext,
    walletsBoundedContext: WalletsBoundedContext,
    puntersDomainConfig: PuntersDomainConfig)(implicit ec: ExecutionContext) {

  private val log = LoggerFactory.getLogger(getClass)

  def signUp(signUpData: TestAccountSignUpRequest): EitherT[Future, TestAccountSignUpError, Unit] = {
    log.info("Starting signup of test user {}", kv("Username", signUpData.username.value))
    val now = clock.currentOffsetDateTime()
    val result = for {
      _ <- enforceMaximumAmountOfPunters()
      _ <- enforceAgeRestriction(signUpData.dateOfBirth, now)
      _ <- validateUsername(signUpData.username)
      _ <- ensureUserDoesNotExist(signUpData)
      punterId <- registerInIdentityProvider(signUpData)
      _ = log.info(
        s"[${signUpData.username}] created in IdentityProvider and has punterId {}",
        kv("PunterId", punterId.value))
      _ <- registerInBackend(punterId, signUpData, now)
      _ = log.info(s"[${signUpData.username}] registration complete for punterId {}", kv("PunterId", punterId.value))
    } yield ()
    result.leftMap { error =>
      log.info(s"[${signUpData.username}] registration failed with $error")
      error
    }
  }

  private def enforceMaximumAmountOfPunters()
      : EitherT[Future, TestAccountSignUpError.MaximumAmountOfPuntersCheckNotPassed.type, Unit] =
    EitherT {
      puntersRepository.countPuntersWithStartedRegistration().map { amount =>
        Either.cond(
          amount < puntersDomainConfig.maximumAmountOfPunters.value,
          (),
          TestAccountSignUpError.MaximumAmountOfPuntersCheckNotPassed)
      }
    }

  private def enforceAgeRestriction(
      dateOfBirth: DateOfBirth,
      now: OffsetDateTime): EitherT[Future, TestAccountSignUpError.AgeRestrictionNotPassed.type, Unit] =
    EitherT.cond(
      AgeRestrictionEnforcement.passesAgeRestrictionCheck(dateOfBirth, now),
      (),
      TestAccountSignUpError.AgeRestrictionNotPassed)

  private def validateUsername(
      username: Username): EitherT[Future, TestAccountSignUpError.ForbiddenCharactersInUsername.type, Unit] =
    EitherT.cond(!username.value.contains("@"), (), TestAccountSignUpError.ForbiddenCharactersInUsername)

  private def ensureUserDoesNotExist(signUpData: TestAccountSignUpRequest)
      : EitherT[Future, TestAccountSignUpError.ConflictingPunterInformation.type, Unit] = {

    val lookupByUsername = EitherT
      .right(authenticationRepository.userExists(UserLookupId.byUsername(signUpData.username)))
      .ensure(TestAccountSignUpError.ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    val lookupByEmail = EitherT
      .right(authenticationRepository.userExists(UserLookupId.byEmail(signUpData.email)))
      .ensure(TestAccountSignUpError.ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    for {
      _ <- lookupByUsername
      _ <- lookupByEmail
    } yield ()
  }

  private def registerInIdentityProvider(
      signUpData: TestAccountSignUpRequest): EitherT[Future, TestAccountSignUpError, PunterId] =
    for {
      validPassword <-
        ValidPassword
          .from(signUpData.password)
          .toEitherTCombined
          .leftMap(_ => TestAccountSignUpError.WrongPasswordFormat)
      punterId <- EitherT.right(authenticationRepository.register(userDetails(signUpData), validPassword))
    } yield punterId

  private def registerInBackend(
      punterId: PunterId,
      signUpRequest: TestAccountSignUpRequest,
      now: OffsetDateTime): EitherT[Future, TestAccountSignUpError, Unit] =
    for {
      _ <- createWallet(punterId)
      terms <- EitherT.liftF(termsAndConditionsRepository.getCurrentTerms())
      _ <- storePunter(punterId, signUpRequest, terms, now)
      _ <- createPunterProfile(punterId, signUpRequest.referralCode).leftWiden[TestAccountSignUpError]
    } yield ()

  private def userDetails(signUpData: TestAccountSignUpRequest): UserDetailsKeycloak =
    UserDetailsKeycloak(userName = signUpData.username, email = signUpData.email, isEmailVerified = true)

  private def createPunterProfile(
      punterId: PunterId,
      referralCode: Option[ReferralCode]): EitherT[Future, TestAccountSignUpError, PunterProfile] = {
    for {
      _ <-
        puntersBoundedContext
          .createUnverifiedPunterProfile(
            id = punterId,
            referralCode = referralCode,
            depositLimits = Limits.none,
            stakeLimits = Limits.none,
            sessionLimits = Limits.none,
            isTestAccount = true)
          .leftMap((_: PunterProfileAlreadyExists) => TestAccountSignUpError.PunterProfileAlreadyExists)
      _ <-
        puntersBoundedContext
          .verifyPunter(punterId, ActivationPath.IDPV)
          .leftMap(e => TestAccountSignUpError.IllegalStateError(e.simpleObjectName))
      profile <-
        puntersBoundedContext
          .getPunterProfile(punterId)
          .leftMap[TestAccountSignUpError]((e: PunterProfileDoesNotExist) =>
            TestAccountSignUpError.IllegalStateError(e.simpleObjectName))

    } yield profile

  }

  private def storePunter(
      punterId: PunterId,
      request: TestAccountSignUpRequest,
      terms: Terms,
      now: OffsetDateTime): EitherT[Future, TestAccountSignUpError, Unit] = {
    val punterDetails = PunterPersonalDetails(
      request.username,
      request.name,
      request.email,
      request.phoneNumber,
      request.address,
      request.dateOfBirth,
      request.gender,
      isTestAccount = true,
      document = None,
      isPhoneNumberVerified = true)
    val punterSettings = PunterSettings(
      lastSignIn = None,
      userPreferences = UserPreferences.default,
      termsAgreement = TermsAgreement(TermsAcceptedVersion.fromCurrent(terms.currentTermsVersion), now),
      signUpDate = now,
      isRegistrationVerified = true,
      isAccountVerified = false,
      mfaEnabled = false)
    val punter =
      Punter(punterId, punterDetails, ssn = Right(request.ssn), punterSettings)

    puntersRepository.register(punter, finishedAt = clock.currentOffsetDateTime()).leftMap {
      case PuntersRepositoryErrors.PunterIdAlreadyExists       => TestAccountSignUpError.PunterProfileAlreadyExists
      case PuntersRepositoryErrors.PunterUsernameAlreadyExists => TestAccountSignUpError.ConflictingPunterInformation
      case PuntersRepositoryErrors.PunterEmailAlreadyExists    => TestAccountSignUpError.ConflictingPunterInformation
      case PuntersRepositoryErrors.SSNAlreadyExists            => TestAccountSignUpError.SSNAlreadyExists
    }
  }

  private def createWallet(punterId: PunterId): EitherT[Future, TestAccountSignUpError, Unit] =
    walletsBoundedContext
      .createWallet(WalletId.deriveFrom(punterId))
      .bimap((_: WalletAlreadyExistsError) => TestAccountSignUpError.WalletAlreadyExists, _ => ())
      .leftWiden[TestAccountSignUpError]
}

sealed trait TestAccountSignUpError
object TestAccountSignUpError {
  case object ConflictingPunterInformation extends TestAccountSignUpError
  case object MaximumAmountOfPuntersCheckNotPassed extends TestAccountSignUpError
  case object AgeRestrictionNotPassed extends TestAccountSignUpError
  case object ForbiddenCharactersInUsername extends TestAccountSignUpError
  case object PunterProfileAlreadyExists extends TestAccountSignUpError
  case object WalletAlreadyExists extends TestAccountSignUpError
  case object SSNAlreadyExists extends TestAccountSignUpError
  case object WrongPasswordFormat extends TestAccountSignUpError
  case class IllegalStateError(message: String) extends TestAccountSignUpError
}
