package phoenix.punters.infrastructure.http

import java.util.UUID

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT
import cats.syntax.either._
import sttp.model.StatusCode

import phoenix.bets.BetsBoundedContext
import phoenix.core.Clock
import phoenix.core.emailing.Mailer
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.core.error.RegistrationErrorCode
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives
import phoenix.http.core.TapirAuthDirectives.ErrorOut
import phoenix.jwt.JwtAuthenticator
import phoenix.notes.domain.NoteRepository
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.application.MultifactorVerification
import phoenix.punters.application.RefreshTokenUseCase.InvalidToken
import phoenix.punters.application.RefreshTokenUseCase.PunterDoesNotExist
import phoenix.punters.application.RefreshTokenUseCase.PunterSuspended
import phoenix.punters.application._
import phoenix.punters.domain.AccountVerificationCodeRepository
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.CoolOffCause
import phoenix.punters.domain.DeviceFingerprint
import phoenix.punters.domain.MultiFactorAuthenticationService
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterDeviceFingerprintsRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.SuspensionEntity
import phoenix.punters.domain.SuspensionEntity.RegistrationIssue
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.VerificationFailure
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.application.AnswerKBAQuestions
import phoenix.punters.idcomply.application.AnswerKBAQuestionsError
import phoenix.punters.idcomply.application.CheckIDPVStatus
import phoenix.punters.idcomply.application.CheckIDPVStatusError
import phoenix.punters.idcomply.application.RegistrationSignUp
import phoenix.punters.idcomply.application.RequestIDPVProcess
import phoenix.punters.idcomply.domain.IdComplyService
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.idcomply.domain.RequestKYC.KYCErrorKey
import phoenix.punters.idcomply.domain.SubmitKBAAnswers.KBAError
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.ForgotPasswordRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.GetSessionTimerResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.GetTermsResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginResponse.LoggedInResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.LoginResponse.VerificationRequestedResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RequestVerificationResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.StartIDPVResponse
import phoenix.utils.UUIDGenerator
import phoenix.wallets.WalletsBoundedContext

final class PunterRoutes(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    bets: BetsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersViewRepository: View01PatronDetailsRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    multiFactorAuthenticationService: MultiFactorAuthenticationService,
    accountVerificationCodeRepository: AccountVerificationCodeRepository,
    registrationEventRepository: RegistrationEventRepository,
    limitsHistoryRepository: PunterLimitsHistoryRepository,
    deviceFingerprintsRepository: PunterDeviceFingerprintsRepository,
    coolOffsHistoryRepository: PunterCoolOffsHistoryRepository,
    idComplyService: IdComplyService,
    excludedPlayersRepository: ExcludedPlayersRepository,
    mailer: Mailer,
    noteRepository: NoteRepository,
    uuidGenerator: UUIDGenerator,
    clock: Clock,
    puntersDomainConfig: PuntersDomainConfig)(implicit auth: JwtAuthenticator, ec: ExecutionContext)
    extends Routes {

  private implicit val c = clock

  private val refreshTokenUseCase = new RefreshTokenUseCase(authenticationRepository, punters)

  val requestVerificationUseCase =
    new RequestVerification(multiFactorAuthenticationService, authenticationRepository, puntersRepository)

  val authCodeAuthorizer: UUID => EitherT[Future, ErrorOut, PunterId] =
    TapirAuthDirectives.authByAccountVerificationCodeAndAuthorizeActive(_, accountVerificationCodeRepository, punters)

  private val loginRoute = {
    val loginUseCase = new LoginUseCase(
      authenticationRepository,
      puntersRepository,
      punters,
      multiFactorAuthenticationService,
      termsAndConditionsRepository,
      deviceFingerprintsRepository,
      uuidGenerator,
      clock)
    PunterTapirEndpoints.login(punters, authenticationRepository).serverLogic {
      case (loginRequest, registeredUser, punterProfile) => {
        case None =>
          Future.successful(Left(ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.UndefinedIPAddress)))
        case Some(clientIP) =>
          loginUseCase
            .login(
              punterProfile,
              registeredUser,
              loginRequest.username,
              loginRequest.password,
              loginRequest.deviceFingerprint.getOrElse(DeviceFingerprint.empty),
              clientIP)
            .map {
              case LoginUseCaseOutput.VerificationRequested(verificationId) =>
                VerificationRequestedResponse(verificationId)
              case LoginUseCaseOutput.SuccessfulLogin(loggedIn) =>
                LoggedInResponse(loggedIn)
            }
            .leftMap {
              case LoginUseCaseError.PunterShouldResetPassword =>
                ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterShouldResetPassword)
              case LoginUseCaseError.PunterSuspended =>
                ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.PunterIsSuspended)
              case LoginUseCaseError.SendVerificationCodeFailure =>
                ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.SendVerificationCodeFailure)
              case LoginUseCaseError.InvalidPhoneNumber =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPhoneNumber)
              case LoginUseCaseError.MaxMFASendCodeAttemptsReached =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaxMFASendCodeAttemptsReached)
              case LoginUseCaseError.PunterProfileDoesNotExist | LoginUseCaseError.UnauthorizedLoginError =>
                ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorisedResponseDuringLogin)
              case LoginUseCaseError.UnauthorizedLoginWithPasswordResetError =>
                ErrorResponse
                  .tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorisedResponseRequiringPasswordReset)
            }
            .value
      }
    }
  }

  val loginWithVerificationRoute = {
    val loginWithVerificationUseCase =
      new LoginWithVerificationUseCase(
        authenticationRepository,
        puntersRepository,
        punters,
        multiFactorAuthenticationService,
        uuidGenerator,
        termsAndConditionsRepository,
        deviceFingerprintsRepository,
        clock)
    PunterTapirEndpoints.loginWithVerification(punters, authenticationRepository).serverLogic {
      case (loginWithVerificationRequest, registeredUserKeycloak, punterProfile) => {
        case None =>
          Future.successful(Left(ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.UndefinedIPAddress)))
        case Some(clientIP) =>
          loginWithVerificationUseCase
            .loginWithVerification(
              punterProfile,
              registeredUserKeycloak,
              loginWithVerificationRequest.username,
              loginWithVerificationRequest.password,
              loginWithVerificationRequest.verificationId,
              loginWithVerificationRequest.verificationCode,
              loginWithVerificationRequest.deviceFingerprint.getOrElse(DeviceFingerprint.empty),
              clientIP)
            .leftMap {
              case LoginWithVerificationError.PunterShouldResetPassword =>
                ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterShouldResetPassword)
              case LoginWithVerificationError.UnauthorizedLoginError |
                  LoginWithVerificationError.WrongPasswordFormatError |
                  LoginWithVerificationError.PunterProfileDoesNotExist =>
                ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorisedResponseDuringLogin)
              case LoginWithVerificationError.UnauthorizedLoginWithPasswordResetError =>
                ErrorResponse
                  .tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorisedResponseRequiringPasswordReset)
              case LoginWithVerificationError.IncorrectVerification =>
                ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.IncorrectMFAVerification)
              case LoginWithVerificationError.IncorrectVerificationWithPasswordReset =>
                ErrorResponse
                  .tupled(StatusCode.Unauthorized, PresentationErrorCode.IncorrectMFAVerificationWithPasswordReset)
              case LoginWithVerificationError.MFAVerificationFailed =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
              case LoginWithVerificationError.MaxMFACheckAttemptsReached =>
                ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
              case LoginWithVerificationError.PunterSuspended =>
                ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsSuspended)
            }
            .value
      }
    }
  }

  val logoutRoute = {
    val logoutUseCase = new LogoutUseCase(authenticationRepository, punters)
    PunterTapirEndpoints.logout(punters).serverLogic { punterId => _ =>
      logoutUseCase
        .logout(punterId)
        .leftMap(_ => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SessionNotFound))
        .value
    }
  }

  val coolOffRoute =
    PunterTapirEndpoints.coolOff(punters).serverLogic { punterId => request =>
      punters
        .beginCoolOff(punterId, request.duration, CoolOffCause.SelfInitiated)
        .leftMap {
          case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case PuntersBoundedContext.PunterSuspendedError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsSuspended)
          case PuntersBoundedContext.PunterInCoolOffError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInCoolOff)
          case PuntersBoundedContext.PunterInSelfExclusionError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInSelfExclusion)
        }
        .value
    }

  val setDepositLimitsRoute =
    PunterTapirEndpoints.setDepositLimit(punters).serverLogic { punterId => depositLimits =>
      punters
        .setDepositLimits(punterId, depositLimits)
        .leftMap {
          case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case PuntersBoundedContext.PunterSuspendedError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsSuspended)
          case PuntersBoundedContext.PunterInCoolOffError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInCoolOff)
          case PuntersBoundedContext.PunterInSelfExclusionError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInSelfExclusion)
        }
        .value
    }

  val setSessionLimitsRoute =
    PunterTapirEndpoints.setSessionLimits(punters).serverLogic { punterId => sessionLimits =>
      punters
        .setSessionLimits(punterId, sessionLimits)
        .leftMap {
          case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case PuntersBoundedContext.PunterSuspendedError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsSuspended)
          case PuntersBoundedContext.PunterInCoolOffError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInCoolOff)
          case PuntersBoundedContext.PunterInSelfExclusionError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInSelfExclusion)
        }
        .value
    }

  val setStakeLimitsRoute =
    PunterTapirEndpoints.setStakeLimits(punters).serverLogic { punterId => stakeLimits =>
      punters
        .setStakeLimits(punterId, stakeLimits)
        .leftMap {
          case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case PuntersBoundedContext.PunterSuspendedError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsSuspended)
          case PuntersBoundedContext.PunterInCoolOffError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInCoolOff)
          case PuntersBoundedContext.PunterInSelfExclusionError(_) =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInSelfExclusion)
        }
        .value
    }

  val getLimitsHistoryRoute =
    PunterTapirEndpoints.getLimitsHistory(punters).serverLogic { punterId => pagination =>
      limitsHistoryRepository.findLimits(pagination, punterId).map(limitsHistory => Right(limitsHistory))
    }

  val getCoolOffsHistoryRoute =
    PunterTapirEndpoints.getCoolOffsHistory(punters).serverLogic { punterId => pagination =>
      coolOffsHistoryRepository.findCoolOffs(pagination, punterId).map(Right(_))
    }

  val getSessionTimerRoute = {
    val getSessionUseCase = new GetCurrentSession(punters, clock)
    PunterTapirEndpoints.getCurrentSession.serverLogic { punterId => _ =>
      getSessionUseCase
        .getCurrentSession(punterId)
        .leftMap {
          case GetCurrentSessionError.PunterProfileDoesNotExist =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case GetCurrentSessionError.PunterHasNoActiveSession =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterHasNoActiveSession)
        }
        .map(output =>
          GetSessionTimerResponse(currentTime = output.currentTime, sessionStartTime = output.sessionStartTime))
        .value
    }
  }

  val selfExcludeRoute =
    PunterTapirEndpoints.selfExclude(punters).serverLogic { punterId => selfExcludeRequest =>
      val selfExcludeUseCase = new SelfExclude(punters, bets)
      val multifactorVerification = new MultifactorVerification(multiFactorAuthenticationService)
      import multifactorVerification._
      withMultifactorVerification(selfExcludeRequest.verificationId, selfExcludeRequest.verificationCode)(
        ifValid = selfExcludeUseCase.selfExclude(punterId, selfExcludeRequest.duration).leftMap {
          case SelfExcludeError.ErrorWhenSelfExcluding(error) =>
            error match {
              case PuntersBoundedContext.PunterProfileDoesNotExist(_) =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
              case PuntersBoundedContext.PunterInSelfExclusionError(_) =>
                ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterIsInSelfExclusion)
            }
          case SelfExcludeError.BetsCancellingErrorWhenSelfExcluding(_) =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
        },
        errorMapping = {
          case VerificationFailure.IncorrectVerificationCode |
              VerificationFailure.VerificationExpiredOrAlreadyApproved =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          case VerificationFailure.UnknownVerificationFailure =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
          case VerificationFailure.MaxCheckAttemptsReached =>
            ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
        }).value
    }

  val startIDPVRoute = {
    val requestIDPVProcess = new RequestIDPVProcess(idComplyService, registrationEventRepository, clock)

    def suspendExistingPunter(punterId: PunterId, suspensionEntity: SuspensionEntity): Future[Unit] =
      punters
        .suspend(punterId, suspensionEntity, suspendedAt = clock.currentOffsetDateTime())
        .leftMap(_ => new Exception("Failed to suspend after unsuccessful try to start IDPV"))
        .rethrowT

    PunterTapirEndpoints.startIDPV(punters).serverLogic { punterId => _ =>
      requestIDPVProcess
        .requestIDPV(punterId)
        .leftSemiflatTap(_ => suspendExistingPunter(punterId, RegistrationIssue.IDPVRequestFailed))
        .bimap(
          _ => ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError),
          StartIDPVResponse)
        .value
    }
  }

  val registrationSignUpRoute = {
    val registrationSignUpUseCase =
      new RegistrationSignUp(
        registrationEventRepository,
        punters,
        wallets,
        authenticationRepository,
        puntersRepository,
        idComplyService,
        noteRepository,
        termsAndConditionsRepository,
        excludedPlayersRepository,
        deviceFingerprintsRepository,
        uuidGenerator,
        clock,
        puntersDomainConfig)

    PunterTapirEndpoints.registrationSignUp.serverLogic {
      case (signupRequest, clientIp) =>
        registrationSignUpUseCase
          .registrationSignUp(signupRequest, clientIp)
          .leftMap {
            case RegistrationSignUp.MaximumAmountOfPuntersCheckNotPassed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaximumAmountOfPuntersCheckNotPassed)
            case RegistrationSignUp.AgeRestrictionNotPassed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.AgeRestrictionNotPassed)
            case RegistrationSignUp.WrongPasswordFormat =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPassword)
            case RegistrationSignUp.ForbiddenCharactersInUsername =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidUsername)
            case RegistrationSignUp.ConflictingPunterInformation =>
              ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ConflictingPunterInformation)
            case RegistrationSignUp.DuplicateSSN | RegistrationSignUp.PlayerExcludedFromGambling =>
              ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterShouldContactCustomerService)
            case RegistrationSignUp.KYCWrongRequest(KYCErrorKey.UnknownError) =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.RegistrationInformationAdjusting)
            case RegistrationSignUp.KYCWrongRequest(key) =>
              ErrorResponse.tupled(
                StatusCode.BadRequest,
                RegistrationErrorCode(s"registrationInformation${key.toString}"))
            case RegistrationSignUp.KYCMatchingFailed =>
              ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterShouldContactCustomerService)
            case RegistrationSignUp.KBAFailed(_) | RegistrationSignUp.IDPVFailed(_) =>
              ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
          }
          .value
    }
  }

  val answerKBAQuestionsRoute = {
    val answerKBAQuestionsUseCase = new AnswerKBAQuestions(
      punters,
      puntersRepository,
      registrationEventRepository,
      idComplyService,
      noteRepository,
      uuidGenerator,
      clock)

    PunterTapirEndpoints.answerKBAQuestions.serverLogic { answerKBAQuestionsRequest =>
      answerKBAQuestionsUseCase
        .handleAnswers(answerKBAQuestionsRequest.punterId, answerKBAQuestionsRequest.answers)
        .leftMap {
          case AnswerKBAQuestionsError.AnswerKBAFailed(kbaError) =>
            kbaError match {
              case KBAError.QuestionsExpired =>
                ErrorResponse.tupled(
                  StatusCode.BadRequest,
                  PresentationErrorCode.RegistrationInformationQuestionsExpired)
              case _ =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.RegistrationInformationFailure)
            }
          case AnswerKBAQuestionsError.PunterWasNotAskedForQuestions | AnswerKBAQuestionsError.IDPVFailed(_) =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.RegistrationInformationFailure)
          case AnswerKBAQuestionsError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
        }
        .value
    }
  }

  val checkIDPVStatusRoute = {
    val checkIDPVStatusUseCase = new CheckIDPVStatus(
      punters,
      registrationEventRepository,
      puntersRepository,
      idComplyService,
      noteRepository,
      excludedPlayersRepository,
      uuidGenerator,
      clock)

    PunterTapirEndpoints.checkIDPVStatus.serverLogic { request =>
      checkIDPVStatusUseCase
        .checkIDPVStatus(request.punterId)
        .leftMap {
          case CheckIDPVStatusError.CannotVerifyPunter =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CannotVerifyPunter)
          case CheckIDPVStatusError.PunterWasNotAskedForPhotoVerification =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.RegistrationInformationFailure)
          case CheckIDPVStatusError.IDPVNotCompleted =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PhotoVerificationNotCompleted)
          case CheckIDPVStatusError.PunterNotFound | CheckIDPVStatusError.PunterSuspensionError =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
          case CheckIDPVStatusError.PunterRegistrationFailed =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.PunterShouldContactCustomerService)
        }
        .value
    }
  }

  val activateAccountRoute = {
    val activateAccountUseCase = new ActivateAccount(authenticationRepository, puntersRepository)

    PunterTapirEndpoints.activateAccount.serverLogic { authCode =>
      authCodeAuthorizer(authCode).flatMap { punterId =>
        activateAccountUseCase.activateAccount(punterId).leftMap {
          case ActivateAccountError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
        }
      }.value
    }
  }

  val forgotPasswordRoute = {
    val forgotPasswordUseCase =
      new ForgotPassword(accountVerificationCodeRepository, puntersRepository, punters, mailer, clock)
    PunterTapirEndpoints.forgotPassword.serverLogic {
      case (emailRequest: ForgotPasswordRequest, phoenixAppBaseUrlInput) =>
        forgotPasswordUseCase
          .forgotPassword(emailRequest.email, phoenixAppBaseUrlInput.value)
          .value
          .map(_ => ().asRight[Unit])
    }
  }

  val resetPasswordRoute = {
    val resetPasswordUseCase =
      new ResetPassword(authenticationRepository, punters, multiFactorAuthenticationService, mailer, clock)

    PunterTapirEndpoints.resetPassword.serverLogic {
      case (authCode, request) =>
        authCodeAuthorizer(authCode).flatMap { punterId =>
          resetPasswordUseCase
            .resetPassword(punterId, request.password, request.verificationId, request.verificationCode)
            .leftMap {
              case ResetPasswordError.WrongPasswordFormat =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPassword)
              case ResetPasswordError.PunterNotFound | ResetPasswordError.UnauthorizedLoginOnPasswordChange =>
                ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorizedRequest)
              case ResetPasswordError.InvalidMFAVerification =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
              case ResetPasswordError.MaxMFACheckAttemptsReached =>
                ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
              case ResetPasswordError.MFAVerificationFailed =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
            }
        }.value
    }
  }

  val changePasswordRoute = {
    val changePasswordUseCase =
      new ChangePassword(authenticationRepository, multiFactorAuthenticationService, mailer, clock)
    PunterTapirEndpoints.changePassword(punters).serverLogic { punterId => changePasswordRequest =>
      changePasswordUseCase
        .changePassword(
          punterId,
          currentPassword = changePasswordRequest.currentPassword,
          newPassword = changePasswordRequest.newPassword,
          verificationId = changePasswordRequest.verificationId,
          verificationCode = changePasswordRequest.verificationCode)
        .leftMap {
          case ChangePasswordUseCaseError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case ChangePasswordUseCaseError.CurrentPasswordNotMatching =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.CurrentPasswordDoesNotMatchExisting)
          case ChangePasswordUseCaseError.PunterSuspended =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsSuspended)
          case ChangePasswordUseCaseError.NewPasswordHasInvalidFormat =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.NewPasswordInvalid)
          case ChangePasswordUseCaseError.UnauthorizedLoginOnPasswordChange =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
          case ChangePasswordUseCaseError.InvalidMFAVerification =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          case ChangePasswordUseCaseError.MaxMFACheckAttemptsReached =>
            ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
          case ChangePasswordUseCaseError.MFAVerificationFailed =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
        }
        .value
    }
  }

  val requestVerificationRoute = {
    PunterTapirEndpoints.requestVerification(punters).serverLogic { punterId => _ =>
      requestVerificationUseCase
        .requestVerificationById(punterId)
        .leftMap {
          case RequestVerificationError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case RequestVerificationError.InvalidPhoneNumber =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPhoneNumber)
          case RequestVerificationError.MaxMFASendCodeAttemptsReached =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaxMFASendCodeAttemptsReached)
          case RequestVerificationError.SendVerificationCodeFailure =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.SendVerificationCodeFailure)
          case RequestVerificationError.MFAFailed =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
        }
        .map(RequestVerificationResponse.apply)
        .value
    }
  }

  val requestVerificationForEmailVerifiedUserRoute = {
    PunterTapirEndpoints.requestVerificationForEmailVerifiedUser.serverLogic { authCode =>
      authCodeAuthorizer(authCode).flatMap { punterId =>
        requestVerificationUseCase
          .requestVerificationById(punterId)
          .leftMap {
            case RequestVerificationError.PunterNotFound =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
            case RequestVerificationError.InvalidPhoneNumber =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPhoneNumber)
            case RequestVerificationError.MaxMFASendCodeAttemptsReached =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaxMFASendCodeAttemptsReached)
            case RequestVerificationError.SendVerificationCodeFailure =>
              ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.SendVerificationCodeFailure)
            case RequestVerificationError.MFAFailed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          }
          .map(RequestVerificationResponse.apply)
      }.value
    }
  }

  val requestVerificationForUserByPhoneRoute = {
    PunterTapirEndpoints.requestVerificationForUserByPhone.serverLogic {
      case (request, optionalIpAddress) =>
        requestVerificationUseCase
          .requestVerificationByPhone(request.phoneNumber, request.deviceFingerprint, optionalIpAddress)
          .leftMap {
            case RequestVerificationError.PunterNotFound =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
            case RequestVerificationError.InvalidPhoneNumber =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPhoneNumber)
            case RequestVerificationError.MaxMFASendCodeAttemptsReached =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaxMFASendCodeAttemptsReached)
            case RequestVerificationError.SendVerificationCodeFailure =>
              ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.SendVerificationCodeFailure)
            case RequestVerificationError.MFAFailed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          }
          .map(RequestVerificationResponse.apply)
          .value
    }
  }
  val checkVerificationRoute = {
    PunterTapirEndpoints.checkVerification.serverLogic {
      case (request, optionalIpAddress) =>
        requestVerificationUseCase
          .checkVerification(request.id, request.code, optionalIpAddress)
          .leftMap {
            case RequestVerificationError.PunterNotFound =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
            case RequestVerificationError.InvalidPhoneNumber =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidPhoneNumber)
            case RequestVerificationError.MaxMFASendCodeAttemptsReached =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaxMFASendCodeAttemptsReached)
            case RequestVerificationError.SendVerificationCodeFailure =>
              ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.SendVerificationCodeFailure)
            case RequestVerificationError.MFAFailed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          }
          .value
    }
  }

  val refreshTokenRoute =
    PunterTapirEndpoints.refreshToken.serverLogic { refreshTokenRequest =>
      refreshTokenUseCase
        .refreshToken(refreshTokenRequest.refresh_token)
        .leftMap {
          case InvalidToken =>
            ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.InvalidRefreshToken)
          case PunterSuspended =>
            ErrorResponse.tupled(StatusCode.Forbidden, PresentationErrorCode.PunterIsSuspended)
          case PunterDoesNotExist =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
        }
        .value
    }

  val getTermsRoute = PunterTapirEndpoints.getTerms.serverLogic(_ =>
    for {
      terms <- termsAndConditionsRepository.getCurrentTerms()
    } yield GetTermsResponse(terms.currentTermsVersion, terms.termsContent).asRight[Unit])

  val acceptTermsRoute = {
    val acceptTermsUseCase = new AcceptTerms(termsAndConditionsRepository, puntersRepository, clock)
    PunterTapirEndpoints.acceptTerms(punters).serverLogic { punterId => acceptTermsRequest =>
      acceptTermsUseCase
        .acceptTerms(punterId, acceptTermsRequest.version)
        .leftMap {
          case AcceptTermsError.AcceptedVersionWasNotTheLatest =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.AcceptedTermsVersionWasNotTheLatest)
          case AcceptTermsError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
        }
        .value
    }
  }

  val retrievePunterProfileRoute = {
    val retrievePunterProfileUseCase =
      new RetrievePunterProfile(
        authenticationRepository,
        punters,
        wallets,
        termsAndConditionsRepository,
        puntersRepository,
        clock)
    PunterTapirEndpoints.retrievePunterProfile(punters).serverLogic { punterId => _ =>
      retrievePunterProfileUseCase
        .retrievePunterProfile(punterId)
        .map(PunterProfileForPunterPresentation.from)
        .leftMap {
          case RetrievePunterProfileError.PunterProfileNotFoundInContext =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case RetrievePunterProfileError.PunterProfileNotFoundInRepository =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case RetrievePunterProfileError.AuthenticationProfileNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case RetrievePunterProfileError.WalletNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.WalletNotFound)
        }
        .value
    }
  }

  val updatePunterDetailsRoute = {
    val updatePunterDetailsUseCase =
      new UpdatePunterDetails(puntersRepository, puntersViewRepository, excludedPlayersRepository, punters, bets)
    PunterTapirEndpoints.updatePunterDetails(punters).serverLogic { punterId => updatePunterDetailsRequest =>
      updatePunterDetailsUseCase
        .updatePunterDetails(punterId, updatePunterDetailsRequest)
        .leftMap {
          case UpdatePunterProfileError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case UpdatePunterProfileError.ConflictingData =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ConflictingPunterInformation)
        }
        .value
    }
  }

  val updatePunterPreferencesRoute = {
    val updatePunterPreferencesUseCase = new UpdatePunterPreferences(puntersRepository)
    PunterTapirEndpoints.updatePunterPreferences(punters).serverLogic { punterId => newPunterPreferences =>
      updatePunterPreferencesUseCase
        .updatePunterPreferences(punterId, newPunterPreferences)
        .leftMap {
          case UpdatePunterPreferencesError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
        }
        .value
    }
  }

  val updatePunterEmailRoute = {
    val updatePunterEmailUseCase =
      new UpdatePunterEmail(multiFactorAuthenticationService, authenticationRepository, puntersRepository)
    PunterTapirEndpoints.updatePunterEmail(punters).serverLogic { punterId => updateEmailRequest =>
      updatePunterEmailUseCase
        .update(
          punterId,
          updateEmailRequest.newEmail,
          updateEmailRequest.verificationId,
          updateEmailRequest.verificationCode)
        .leftMap {
          case UpdatePunterEmailError.InvalidMFAVerification =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
          case UpdatePunterEmailError.EmailAlreadyUsed =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.EmailAlreadyUsed)
          case UpdatePunterEmailError.EmailChangeError =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.EmailChangeError)
          case UpdatePunterEmailError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
          case UpdatePunterEmailError.MFAVerificationFailed =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
          case UpdatePunterEmailError.MaxMFACheckAttemptsReached =>
            ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
        }
        .value
    }
  }

  val updateMultiFactorAuthenticationEnabledStatusRoute = {
    val useCase =
      new UpdateMultiFactorAuthenticationEnabledStatus(
        multiFactorAuthenticationService,
        authenticationRepository,
        puntersRepository,
        puntersDomainConfig)
    PunterTapirEndpoints.updateMultifactorAuthenticationEnabledStatus(punters).serverLogic {
      punterId => updateMFAEnabledStatusRequest =>
        useCase
          .update(
            punterId,
            newMFAEnabledStatus = updateMFAEnabledStatusRequest.enabled,
            updateMFAEnabledStatusRequest.verificationId,
            updateMFAEnabledStatusRequest.verificationCode)
          .leftMap {
            case UpdateMultiFactorAuthenticationEnabledStatusError.InvalidMFAVerification =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.IncorrectMFAVerification)
            case UpdateMultiFactorAuthenticationEnabledStatusError.PunterNotFound =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
            case UpdateMultiFactorAuthenticationEnabledStatusError.MFAVerificationFailed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAVerificationFailure)
            case UpdateMultiFactorAuthenticationEnabledStatusError.MaxMFACheckAttemptsReached =>
              ErrorResponse.tupled(StatusCode.TooManyRequests, PresentationErrorCode.MaxMFACheckAttemptsReached)
            case UpdateMultiFactorAuthenticationEnabledStatusError.MFAChangeNotAllowed =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MFAChangeNotAllowed)
          }
          .value
    }
  }

  val endpoints: Routes.Endpoints = List(
    startIDPVRoute,
    registrationSignUpRoute,
    answerKBAQuestionsRoute,
    checkIDPVStatusRoute,
    activateAccountRoute,
    loginRoute,
    loginWithVerificationRoute,
    logoutRoute,
    refreshTokenRoute,
    forgotPasswordRoute,
    resetPasswordRoute,
    changePasswordRoute,
    requestVerificationRoute,
    requestVerificationForEmailVerifiedUserRoute,
    requestVerificationForUserByPhoneRoute,
    checkVerificationRoute,
    coolOffRoute,
    setDepositLimitsRoute,
    setSessionLimitsRoute,
    setStakeLimitsRoute,
    getLimitsHistoryRoute,
    getCoolOffsHistoryRoute,
    getSessionTimerRoute,
    selfExcludeRoute,
    getTermsRoute,
    acceptTermsRoute,
    retrievePunterProfileRoute,
    updatePunterDetailsRoute,
    updatePunterPreferencesRoute,
    updatePunterEmailRoute,
    updateMultiFactorAuthenticationEnabledStatusRoute)

}
