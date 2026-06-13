package phoenix.punters.application

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.Clock
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.domain.Address
import phoenix.punters.domain.AddressLine
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.AuthenticationRepository.UserLookupId
import phoenix.punters.domain.City
import phoenix.punters.domain.Country
import phoenix.punters.domain.DateOfBirth
import phoenix.punters.domain.Email
import phoenix.punters.domain.Limits
import phoenix.punters.domain.MobilePhoneNumber
import phoenix.punters.domain.Punter
import phoenix.punters.domain.PunterPersonalDetails
import phoenix.punters.domain.PunterSettings
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.PuntersRepositoryErrors
import phoenix.punters.domain.SocialSecurityNumber.Last4DigitsOfSSN
import phoenix.punters.domain.State
import phoenix.punters.domain.Terms
import phoenix.punters.domain.TermsAcceptedVersion
import phoenix.punters.domain.TermsAgreement
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.UserDetailsKeycloak
import phoenix.punters.domain.UserPreferences
import phoenix.punters.domain.Username
import phoenix.punters.domain.ValidPassword
import phoenix.punters.domain.Zipcode
import phoenix.punters.idcomply.application.RegistrationSignUp
import phoenix.punters.idcomply.application.RegistrationSignUp._
import phoenix.punters.idcomply.domain.Events.PunterSignUpStarted
import phoenix.punters.idcomply.domain.Events.SignUpEventData
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreateBackofficeUserRequest

final class CreateUserUseCase(
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersBoundedContext: PuntersBoundedContext,
    registrationEventRepository: RegistrationEventRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository)(implicit ec: ExecutionContext, clock: Clock) {

  def createUser(signUpRequest: CreateBackofficeUserRequest): EitherT[Future, RegistrationRequestError, Unit] = {
    val now = clock.currentOffsetDateTime()
    for {
      _ <- checkUsernameAndEmailNotAlreadyRegistered(signUpRequest.username, signUpRequest.email)
      punterId <- registerInIdentityProvider(signUpRequest)
      terms <- EitherT.liftF(termsAndConditionsRepository.getCurrentTerms())
      punterDetails = stubPunterDetails(signUpRequest)
      signUpEventData = SignUpEventData(
        name = signUpRequest.personalName,
        username = signUpRequest.username,
        email = signUpRequest.email,
        phoneNumber = punterDetails.phoneNumber,
        address = punterDetails.address,
        dateOfBirth = punterDetails.dateOfBirth,
        gender = None,
        ssn = Last4DigitsOfSSN("0000"),
        referralCode = None)
      _ <- registerPunterDetails(punterId, punterDetails, signUpEventData, terms, now)
      _ <- EitherT.liftF(registrationEventRepository.save(PunterSignUpStarted(punterId, now, signUpEventData)))
      _ <- EitherT.liftF(createPunterInUnverifiedState(punterId))
    } yield ()
  }

  private def registerPunterDetails(
      punterId: PunterId,
      punterDetails: PunterPersonalDetails,
      signUpEventData: SignUpEventData,
      terms: Terms,
      now: OffsetDateTime): EitherT[Future, RegistrationRequestError, Unit] = {
    val punter = Punter(
      punterId,
      punterDetails,
      ssn = Left(signUpEventData.ssn),
      PunterSettings(
        None,
        UserPreferences.default,
        TermsAgreement(TermsAcceptedVersion.fromCurrent(terms.currentTermsVersion), clock.currentOffsetDateTime()),
        now,
        isRegistrationVerified = false,
        isAccountVerified = false,
        mfaEnabled = false))

    puntersRepository.startPunterRegistration(punter, clock.currentOffsetDateTime()).leftMap {
      case PuntersRepositoryErrors.PunterIdAlreadyExists       => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.PunterUsernameAlreadyExists => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.PunterEmailAlreadyExists    => RegistrationSignUp.ConflictingPunterInformation
      case PuntersRepositoryErrors.SSNAlreadyExists            => RegistrationSignUp.DuplicateSSN
    }
  }

  private def createPunterInUnverifiedState(punterId: PunterId): Future[Unit] =
    for {
      _ <-
        puntersBoundedContext
          .createUnverifiedPunterProfile(
            punterId,
            depositLimits = Limits.none,
            stakeLimits = Limits.none,
            sessionLimits = Limits.none,
            referralCode = None,
            isTestAccount = false)
          .leftMap(AlreadyExistingPunterOnCreationException)
          .rethrowT
    } yield ()

  private def registerInIdentityProvider(
      signUpData: CreateBackofficeUserRequest): EitherT[Future, RegistrationRequestError, PunterId] =
    EitherT.right(authenticationRepository.register(userDetails(signUpData), ValidPassword.generateRandomPassword()))

  private def checkUsernameAndEmailNotAlreadyRegistered(
      username: Username,
      email: Email): EitherT[Future, ConflictingPunterInformation.type, Unit] = {

    val lookupByUsername = EitherT
      .right(authenticationRepository.userExists(UserLookupId.byUsername(username)))
      .ensure(ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    val lookupByEmail = EitherT
      .right(authenticationRepository.userExists(UserLookupId.byEmail(email)))
      .ensure(ConflictingPunterInformation)(alreadyExists => !alreadyExists)

    for {
      _ <- lookupByUsername
      _ <- lookupByEmail
    } yield ()
  }

  private def userDetails(signUpData: CreateBackofficeUserRequest): UserDetailsKeycloak =
    UserDetailsKeycloak(userName = signUpData.username, email = signUpData.email, isEmailVerified = true)

  private def stubPunterDetails(signUpRequest: CreateBackofficeUserRequest): PunterPersonalDetails =
    PunterPersonalDetails(
      signUpRequest.username,
      signUpRequest.personalName,
      signUpRequest.email,
      MobilePhoneNumber("+900000000"),
      Address(AddressLine.stub(), City.stub(), State.stub(), Zipcode.stub(), Country.stub()),
      DateOfBirth(1, 1, 1990),
      gender = None,
      isTestAccount = false,
      document = None,
      isPhoneNumberVerified = true)
}
