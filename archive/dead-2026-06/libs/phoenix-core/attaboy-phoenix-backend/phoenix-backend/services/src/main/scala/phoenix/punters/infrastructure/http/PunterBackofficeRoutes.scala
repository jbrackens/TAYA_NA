package phoenix.punters.infrastructure.http

import java.nio.charset.StandardCharsets

import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.typed.ActorRef
import akka.actor.typed.ActorSystem
import akka.actor.typed.receptionist.Receptionist
import akka.actor.typed.receptionist.ServiceKey
import akka.actor.typed.scaladsl.AskPattern._
import akka.stream.alpakka.csv.scaladsl.CsvFormatting
import akka.util.Timeout
import cats.data.EitherT
import cats.syntax.either._
import cats.syntax.functor._
import sttp.capabilities.akka.AkkaStreams
import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._

import phoenix.bets.BetsBoundedContext
import phoenix.bets.BetsBoundedContext.BetHistoryQuery
import phoenix.bets.BetsBoundedContext.BetOutcome
import phoenix.bets.BetsBoundedContext.BetStatus
import phoenix.bets.BetsBoundedContext.BetView
import phoenix.bets.infrastructure.BetJsonFormats.betViewCodec
import phoenix.core.Clock
import phoenix.core.EitherTUtils._
import phoenix.core.TimeUtils
import phoenix.core.error.ErrorDetails
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationError
import phoenix.core.error.PresentationErrorCode
import phoenix.core.pagination.PaginatedResult
import phoenix.core.scheduler.AkkaScheduler.Tick
import phoenix.dbviews.infrastructure.View01PatronDetailsRepository
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.adminEndpoint
import phoenix.http.routes.EndpointInputs
import phoenix.http.routes.EndpointInputs.enumQueryWithAllValuesAsDefault
import phoenix.http.routes.EndpointInputs.timeRangeFilter
import phoenix.http.routes.EndpointOutputs.TextCsvFormat
import phoenix.http.routes.HttpBody._
import phoenix.http.routes.backoffice.BackofficeRoutes.MountPoint
import phoenix.jwt.JwtAuthenticator
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterSummary
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterAlreadySuspendedError
import phoenix.punters.PuntersBoundedContext.PunterInSelfExclusionError
import phoenix.punters.PuntersBoundedContext.PunterNotInSelfExclusionError
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.PuntersBoundedContext.PunterSuspendedError
import phoenix.punters.PuntersBoundedContext.SessionNotFound
import phoenix.punters.PuntersConfig
import phoenix.punters.application.CreateUserUseCase
import phoenix.punters.application.DeactivateAccount
import phoenix.punters.application.DeactivateAccountError
import phoenix.punters.application.GetCoolOffs
import phoenix.punters.application.GetCoolOffsError
import phoenix.punters.application.GetLimits
import phoenix.punters.application.GetLimitsError
import phoenix.punters.application.GetPunterSummaries
import phoenix.punters.application.GetSessions
import phoenix.punters.application.LogoutUseCase
import phoenix.punters.application.ResetPunterState
import phoenix.punters.application.ResetPunterStateError
import phoenix.punters.application.RetrievePunterProfile
import phoenix.punters.application.RetrievePunterProfileError
import phoenix.punters.application.UnlockAccount
import phoenix.punters.application.UnlockAccountError
import phoenix.punters.application.UnsuspendPunterError
import phoenix.punters.application.UnsuspendPunterUseCase
import phoenix.punters.application.UpdatePunterDetails
import phoenix.punters.application.UpdatePunterProfileError
import phoenix.punters.application.UpdatePunterSSN
import phoenix.punters.application.UpdatePunterSSNError
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.LimitChange
import phoenix.punters.domain.PunterCoolOffEntry
import phoenix.punters.domain.PunterCoolOffsHistoryRepository
import phoenix.punters.domain.PunterLimitsHistoryRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.Session
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.domain.UserProfile
import phoenix.punters.exclusion.domain.ExcludedPlayersRepository
import phoenix.punters.idcomply.application.RegistrationSignUp
import phoenix.punters.idcomply.application.RegistrationSignUp.RegistrationRequestError
import phoenix.punters.idcomply.domain.RegistrationEventRepository
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterTapirCodecs.dateCodec
import phoenix.punters.infrastructure.http.PunterTapirCodecs.punterIdCodec
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreateBackofficeUserRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreditFundsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.DebitFundsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.FinancialSummaryResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.PunterSSNResponse
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.RejectTransactionRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.SuspendPunterRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterAddressRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterDobRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPersonalNameRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdatePunterPhoneNumberRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.UpdateSSNRequest
import phoenix.reports.ReportsConfig
import phoenix.reports.ReportsModule
import phoenix.wallets.TransactionCategory
import phoenix.wallets.WalletTransactionView
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.ConfirmationOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.InsufficientFundsError
import phoenix.wallets.WalletsBoundedContextProtocol.RejectionOrigin
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.WalletsBoundedContextProtocol.WalletTransactionsQuery
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalOutcome
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.DebitFundsReason
import phoenix.wallets.domain.PaymentMethod._
import phoenix.wallets.infrastructure.WalletCsvFormats._
import phoenix.wallets.infrastructure.WalletJsonFormats._

final class PunterBackofficeRoutes(
    basePath: MountPoint,
    bets: BetsBoundedContext,
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    puntersViewRepository: View01PatronDetailsRepository,
    limitsHistoryRepository: PunterLimitsHistoryRepository,
    coolOffsHistoryRepository: PunterCoolOffsHistoryRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    excludedPlayersRepository: ExcludedPlayersRepository,
    registrationEventRepository: RegistrationEventRepository,
    reportsModule: ReportsModule,
    clock: Clock)(implicit auth: JwtAuthenticator, system: ActorSystem[_])
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.core.currency.CurrencyTapirSchemas._
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._
  import phoenix.wallets.infrastructure.http.WalletTapirSchemas._

  implicit val ec = system.executionContext
  implicit val timeout = Timeout(2.seconds)
  implicit val c = clock

  private val createBackofficeUserUseCase =
    new CreateUserUseCase(
      authenticationRepository,
      puntersRepository,
      punters,
      registrationEventRepository,
      termsAndConditionsRepository)
  private val updatePunterDetailsUseCase =
    new UpdatePunterDetails(puntersRepository, puntersViewRepository, excludedPlayersRepository, punters, bets)
  private val logoutUseCase = new LogoutUseCase(authenticationRepository, punters)

  private def getLimitsHistory =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "limits-history")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[LimitChange]])
      .out(statusCode(StatusCode.Ok))

  private def getCoolOffsHistory =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "cool-offs-history")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[PunterCoolOffEntry]])
      .out(statusCode(StatusCode.Ok))

  private def getSessionHistory =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "session-history")
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[Session]])
      .out(statusCode(StatusCode.Ok))

  private def createBackofficeUser =
    adminEndpoint.post
      .in(basePath / "punters")
      .in(jsonBody[CreateBackofficeUserRequest])
      .out(statusCode(StatusCode.NoContent))

  private def getUserSummaries =
    adminEndpoint.get
      .in(basePath / "punters")
      .in(EndpointInputs.pagination.queryParams)
      .in(EndpointInputs.punterFilter.queryParams)
      .out(jsonBody[PaginatedResult[PunterSummary]])
      .out(statusCode(StatusCode.Ok))

  private def getUserProfile =
    adminEndpoint.get.in(basePath / "punters" / punterId).out(jsonBody[UserProfile]).out(statusCode(StatusCode.Ok))

  private def changeUserProfileDob =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "detail" / "dob")
      .in(jsonBody[UpdatePunterDobRequest])
      .out(statusCode(StatusCode.NoContent))

  private def changeUserProfileAddress =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "detail" / "address")
      .in(jsonBody[UpdatePunterAddressRequest])
      .out(statusCode(StatusCode.NoContent))

  private def changeUserProfilePersonalName =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "detail" / "personal-name")
      .in(jsonBody[UpdatePunterPersonalNameRequest])
      .out(statusCode(StatusCode.NoContent))

  private def changeUserPhoneNumber =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "detail" / "phone-number")
      .in(jsonBody[UpdatePunterPhoneNumberRequest])
      .out(statusCode(StatusCode.NoContent))

  private def updateUserSSN =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "detail" / "ssn")
      .in(jsonBody[UpdateSSNRequest])
      .out(statusCode(StatusCode.NoContent))

  private val getUserSSN =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "detail" / "ssn")
      .out(jsonBody[PunterSSNResponse])
      .out(statusCode(StatusCode.Ok))

  private def suspendPunter =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "lifecycle" / "suspend")
      .in(jsonBody[SuspendPunterRequest])
      .out(statusCode(StatusCode.NoContent))

  private def unsuspendPunter =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "lifecycle" / "unsuspend")
      .out(statusCode(StatusCode.Accepted))

  private def endSelfExclusionPunter =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "lifecycle" / "end-self-exclusion")
      .out(statusCode(StatusCode.NoContent))

  private def resetPunterState =
    adminEndpoint.post.in("punter" / punterId / "reset-state").out(statusCode(StatusCode.NoContent))

  private def deactivateAccount =
    adminEndpoint.post.in("punter" / punterId / "deactivate").out(statusCode(StatusCode.NoContent))

  private def unlockAccount =
    adminEndpoint.post.in("punter" / punterId / "unlock").out(statusCode(StatusCode.NoContent))

  private val logoutPunter =
    adminEndpoint.post.in(basePath / "punters" / punterId / "lifecycle" / "logout").out(statusCode(StatusCode.Ok))

  private def creditFunds =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "funds" / "credit")
      .in(jsonBody[CreditFundsRequest])
      .out(statusCode(StatusCode.NoContent))

  private def debitFunds =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "funds" / "debit")
      .in(jsonBody[DebitFundsRequest])
      .out(statusCode(StatusCode.NoContent))

  private def financialSummary =
    adminEndpoint.get.in(basePath / "punters" / punterId / "financial-summary").out(jsonBody[FinancialSummaryResponse])

  private def betHistory =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "bets")
      .in(timeRangeFilter.queryParams(clock))
      .in(enumQueryWithAllValuesAsDefault[BetStatus]("filters.status"))
      .in(query[Option[BetOutcome]]("filters.outcome"))
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[BetView]])

  private def getTransactions =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "transactions")
      .in(timeRangeFilter.queryParams(clock))
      .in(enumQueryWithAllValuesAsDefault[TransactionCategory]("filters.category"))
      .in(EndpointInputs.pagination.queryParams)
      .out(jsonBody[PaginatedResult[WalletTransactionView]])
      .out(statusCode(StatusCode.Ok))

  private def confirmTransaction =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "transactions" / transactionId / "confirm")
      .out(statusCode(StatusCode.NoContent))

  private def rejectTransaction =
    adminEndpoint.post
      .in(basePath / "punters" / punterId / "transactions" / transactionId / "reject")
      .in(jsonBody[RejectTransactionRequest])
      .out(statusCode(StatusCode.NoContent))

  private def exportTransactions =
    adminEndpoint.get
      .in(basePath / "punters" / punterId / "transactions" / "export")
      .in(timeRangeFilter.queryParams(clock))
      .in(enumQueryWithAllValuesAsDefault[TransactionCategory]("filters.category"))
      .out(streamBody(AkkaStreams)(walletTransactionViewSchema, TextCsvFormat, Some(StandardCharsets.UTF_8)))
      .out(statusCode(StatusCode.Ok))

  private def ingestExcludedPunters =
    adminEndpoint.post.in(basePath / "punters" / "exclusions" / "ingest").out(statusCode(StatusCode.Ok))

  private def exportExcludedPunters =
    adminEndpoint.post.in(basePath / "punters" / "exclusions" / "export").out(statusCode(StatusCode.Ok))

  private val triggerDailyReports =
    adminEndpoint.post.in(basePath / "reports" / "daily").out(statusCode(StatusCode.Ok))

  private val repeatDailyReports =
    adminEndpoint.get
      .in(basePath / "reports" / "daily" / "repeat")
      .in(query[TimeUtils.Date]("on"))
      .out(statusCode(StatusCode.Ok))

  private val getUserSummariesRoute = {
    val getUserSummariesUseCase = new GetPunterSummaries(puntersRepository)
    getUserSummaries.serverLogic { _ =>
      {
        case (pagination, punterSearch) =>
          getUserSummariesUseCase.getPunterSummaries(pagination, punterSearch).map(_.asRight)
      }
    }
  }

  private val getSessionHistoryRoute = {
    val getSessionsUseCase = new GetSessions(punters)
    getSessionHistory.serverLogic { _ =>
      {
        case (punterId, pagination) =>
          getSessionsUseCase
            .getSessions(punterId, pagination)
            .leftMap((_: PunterProfileDoesNotExist) =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist))
            .value
      }
    }
  }

  private val getLimitsHistoryRoute = {
    val getLimitsUseCase = new GetLimits(puntersRepository, limitsHistoryRepository)
    getLimitsHistory.serverLogic { _ =>
      {
        case (punterId, pagination) =>
          getLimitsUseCase
            .getLimits(punterId, pagination)
            .leftMap {
              case GetLimitsError.PunterNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
            }
            .value
      }
    }
  }

  private val getPunterCoolOffsHistoryRoute = {
    val getCoolOffsUseCase = new GetCoolOffs(puntersRepository, coolOffsHistoryRepository)
    getCoolOffsHistory.serverLogic { _ =>
      {
        case (punterId, pagination) =>
          getCoolOffsUseCase
            .getCoolOffs(punterId, pagination)
            .leftMap {
              case GetCoolOffsError.PunterNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
            }
            .value
      }
    }
  }

  private val getUserProfileRoute = {
    val retrievePunterProfileUseCase =
      new RetrievePunterProfile(
        authenticationRepository,
        punters,
        wallets,
        termsAndConditionsRepository,
        puntersRepository,
        clock)
    getUserProfile.serverLogic { _ => punterId =>
      retrievePunterProfileUseCase
        .retrievePunterProfile(punterId)
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

  private def convertUserProfileError: UpdatePunterProfileError => (StatusCode, ErrorResponse) = {
    case UpdatePunterProfileError.PunterNotFound =>
      ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
    case UpdatePunterProfileError.ConflictingData =>
      ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ConflictingPunterInformation)
  }

  private def convertNewUserProfileError: RegistrationRequestError => (StatusCode, ErrorResponse) = {
    case RegistrationSignUp.ConflictingPunterInformation =>
      ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ConflictingPunterInformation)
    case _ =>
      ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InternalError)
  }

  private val createBackofficeUserRoute = createBackofficeUser.serverLogic { _ =>
    {
      case request =>
        createBackofficeUserUseCase.createUser(request).leftMap(convertNewUserProfileError).value
    }
  }

  private val changeUserProfileAddressRoute = changeUserProfileAddress.serverLogic { _ =>
    {
      case (punterId, request) =>
        updatePunterDetailsUseCase.updatePunterAddress(punterId, request).leftMap(convertUserProfileError).value
    }
  }

  private val changeUserProfileDobRoute = changeUserProfileDob.serverLogic { _ =>
    {
      case (punterId, request) =>
        logoutAnd(punterId) {
          updatePunterDetailsUseCase.updatePunterDateOfBirth(punterId, request).leftMap(convertUserProfileError)
        }.value
    }
  }

  private val changeUserProfilePersonalNameRoute = changeUserProfilePersonalName.serverLogic { _ =>
    {
      case (punterId, request) =>
        logoutAnd(punterId) {
          updatePunterDetailsUseCase.updatePunterPersonalName(punterId, request).leftMap(convertUserProfileError)
        }.value
    }
  }

  private val updateUserSSNRoute = {
    val updatePunterSSNUseCase =
      new UpdatePunterSSN(puntersRepository, excludedPlayersRepository, punters, bets)
    updateUserSSN.serverLogic { _ =>
      {
        case (punterId, request) =>
          logoutAnd(punterId) {
            updatePunterSSNUseCase.updatePunterSSN(punterId, request).leftMap {
              case UpdatePunterSSNError.PunterNotFound =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist)
              case UpdatePunterSSNError.SSNAlreadyExists =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterDuplicateSSN)
            }
          }.value
      }
    }
  }

  private val getUserSSNRoute = getUserSSN.serverLogic { _ => punterId =>
    puntersRepository
      .findByPunterId(punterId)
      .map(punter => PunterSSNResponse(punter.ssn.toOption))
      .toRight((ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)))
      .value
  }

  private val changeUserPhoneNumberRoute = changeUserPhoneNumber.serverLogic { _ =>
    {
      case (punterId, request) =>
        logoutAnd(punterId) {
          updatePunterDetailsUseCase.updatePunterPhoneNumber(punterId, request).leftMap(convertUserProfileError)
        }.value
    }
  }

  private val resetPunterStateRoute = {
    val resetPunterStateUseCase =
      new ResetPunterState(punters)

    resetPunterState.serverLogic { _ => punterId =>
      resetPunterStateUseCase
        .resetPunterState(punterId)
        .leftMap {
          case ResetPunterStateError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorizedRequest)
        }
        .value
    }
  }

  private val accountDeactivationRoute = {
    val deactivateAccountUseCase =
      new DeactivateAccount(punters)

    deactivateAccount.serverLogic { _ => punterId =>
      deactivateAccountUseCase
        .deactivateAccount(punterId)
        .leftMap {
          case DeactivateAccountError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorizedRequest)
        }
        .value
    }
  }

  private val unlockAccountRoute = {
    val unlockAccountUseCase =
      new UnlockAccount(punters)

    unlockAccount.serverLogic { _ => punterId =>
      unlockAccountUseCase
        .unlockAccount(punterId)
        .leftMap {
          case UnlockAccountError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorizedRequest)
        }
        .value
    }
  }

  private def logoutAnd[B](punterId: PunterId)(afterLogout: => EitherT[Future, (StatusCode, ErrorResponse), B]) = {
    for {
      _ <- logoutUseCase.logout(punterId).leftFlatMap {
        case SessionNotFound => EitherT.safeRightT(())
        case PunterProfileDoesNotExist(_) =>
          EitherT.leftT(ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterProfileDoesNotExist))
      }: EitherT[Future, (StatusCode, ErrorResponse), Unit]
      _ <- afterLogout
    } yield ()
  }

  private val suspendPunterRoute = suspendPunter.serverLogic { _ =>
    {
      case (punterId, request) =>
        logoutAnd(punterId) {
          punters.suspend(punterId, request.entity, suspendedAt = clock.currentOffsetDateTime()).leftMap {
            case _: PunterProfileDoesNotExist =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
            case _: PunterAlreadySuspendedError =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsSuspended)
            case _: PunterInSelfExclusionError =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsInSelfExclusion)
          }
        }.value
    }
  }

  private val unsuspendPunterRoute = {
    val useCase = new UnsuspendPunterUseCase(punters, puntersRepository)
    unsuspendPunter.serverLogic { adminId => punterId =>
      useCase
        .unsuspend(punterId, adminId)
        .leftMap {
          case UnsuspendPunterError.PunterNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case UnsuspendPunterError.PunterWithoutSSN =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterWithoutSSN)
          case UnsuspendPunterError.PunterNotSuspended =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotSuspended)
        }
        .value
    }
  }

  private val endSelfExclusionPunterRoute = endSelfExclusionPunter.serverLogic { _ => punterId =>
    punters
      .endSelfExclusion(punterId)
      .leftMap {
        case _: PunterProfileDoesNotExist =>
          ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
        case _: PunterNotInSelfExclusionError =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotInSelfExclusion)
        case _: PunterSuspendedError =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsSuspended)
      }
      .value
  }

  private val logoutPunterRoute = logoutPunter.serverLogic { _ => punterId =>
    logoutUseCase
      .logout(punterId)
      .leftMap {
        case SessionNotFound =>
          ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SessionNotFound)
        case _: PunterProfileDoesNotExist =>
          ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
      }
      .value
  }

  private val creditFundsRoute = creditFunds.serverLogic { adminId =>
    {
      case (punterId, request) =>
        wallets
          .deposit(
            WalletId.deriveFrom(punterId),
            request.amount,
            request.reason.getOrElse(CreditFundsReason.Deposit),
            BackOfficeManualPaymentMethod(request.details, adminId))
          .leftMap((_: WalletNotFoundError) =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound))
          .void
          .value
    }
  }

  private val debitFundsRoute = debitFunds.serverLogic { adminId =>
    {
      case (punterId, request) =>
        wallets
          .withdraw(
            WalletId.deriveFrom(punterId),
            request.amount,
            request.reason.getOrElse(DebitFundsReason.Withdrawal),
            BackOfficeManualPaymentMethod(request.details, adminId))
          .leftMap {
            case _: InsufficientFundsError =>
              ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InsufficientFunds)
            case _: WalletNotFoundError =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
          }
          .void
          .value
    }
  }

  private val financialSummaryRoute = financialSummary.serverLogic { _ => punterId =>
    wallets
      .financialSummary(walletId = WalletId.deriveFrom(punterId))
      .map { fs =>
        FinancialSummaryResponse(
          fs.currentBalance,
          fs.openedBets,
          fs.pendingWithdrawals,
          fs.lifetimeDeposits,
          fs.lifetimeWithdrawals,
          fs.netCash)
      }
      .leftMap { _: WalletNotFoundError =>
        ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
      }
      .value
  }

  private val betHistoryRoute = betHistory.serverLogic { _ =>
    {
      case (punterId, timeRange, statuses, outcome, pagination) =>
        val betQuery = BetHistoryQuery(Some(timeRange), statuses, outcome, pagination)
        bets.searchForBets(punterId, betQuery).map(Right.apply)
    }
  }

  val getTransactionsRoute = getTransactions.serverLogic { _ =>
    {
      case (punterId, timeRange, reasons, pagination) =>
        val query = WalletTransactionsQuery(WalletId.deriveFrom(punterId), timeRange, reasons)
        wallets
          .walletTransactions(query, pagination)
          .map(_.map(WalletTransactionView.fromWalletTransaction))
          .map(_.asRight)
    }
  }

  val confirmTransactionRoute = confirmTransaction.serverLogic { adminId =>
    {
      case (punterId, transactionId) =>
        wallets
          .finalizeWithdrawal(
            walletId = WalletId.deriveFrom(punterId),
            reservationId = ReservationId(transactionId),
            outcome = WithdrawalOutcome.Confirmed(ConfirmationOrigin.BackofficeWorker(adminId)))
          .leftMap {
            case _: WalletNotFoundError =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
            case _: ReservationNotFoundError =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.ReservationNotFound)
          }
          .void
          .value
    }
  }

  val rejectTransactionRoute = rejectTransaction.serverLogic { adminId =>
    {
      case (punterId, transactionId, request) =>
        wallets
          .finalizeWithdrawal(
            walletId = WalletId.deriveFrom(punterId),
            reservationId = ReservationId(transactionId),
            outcome = WithdrawalOutcome.Rejected(RejectionOrigin.BackofficeWorker(adminId, request.reason)))
          .leftMap {
            case _: WalletNotFoundError =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
            case _: ReservationNotFoundError =>
              ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.ReservationNotFound)
          }
          .void
          .value
    }
  }

  private val exportTransactionsRoute = exportTransactions.serverLogic { _ =>
    {
      case (punterId, timeRange, reasons) =>
        val query = WalletTransactionsQuery(WalletId.deriveFrom(punterId), timeRange, reasons)
        val source =
          wallets
            .allWalletTransactions(query)
            .map(WalletTransactionView.fromWalletTransaction)
            .map(walletTransactionViewCsvFormat)
            .via(CsvFormatting.format())
        Future.successful(source.asRight)
    }
  }

  def actorJobNotFoundError(serviceKey: ServiceKey[_]) =
    (
      StatusCode.InternalServerError,
      ErrorResponse.one(
        StatusCode.InternalServerError,
        PresentationError(
          PresentationErrorCode.InternalError,
          Some(ErrorDetails(s"Job not found for key $serviceKey, is it registered to the receptionist?")))))

  private val ingestExcludedPuntersRoute = ingestExcludedPunters.serverLogic { _ => _ =>
    val config = PuntersConfig.of(system)
    triggerScheduledJobByName(config.excludedUsers.excludedUsersIngestion.periodicWorker.name)
  }

  private val exportExcludedPuntersRoute = exportExcludedPunters.serverLogic { _ => _ =>
    val config = PuntersConfig.of(system)
    triggerScheduledJobByName(config.excludedUsers.excludedUsersReport.periodicWorker.name)
  }

  private val triggerDailyReportsRoute = triggerDailyReports.serverLogic { _ => _ =>
    val config = ReportsConfig.of(system)
    triggerScheduledJobByName(config.dge.dailyReports.name)
  }

  private val repeatDailyReportsRoute = repeatDailyReports.serverLogic { _ => onDate =>
    reportsModule.executeDGEReports(onDate).map(Right(_))
  }

  private def triggerScheduledJobByName(jobName: String) = {
    val serviceKey = ServiceKey[Tick.type](jobName)
    system.receptionist
      .ask((replyTo: ActorRef[Receptionist.Listing]) => Receptionist.Find(serviceKey, replyTo))
      .map(listing => listing.serviceInstances(serviceKey).headOption.toRight(actorJobNotFoundError(serviceKey)))
      .map(_.map(jobActor => jobActor ! Tick))
  }

  override val endpoints: Routes.Endpoints = List(
    getUserSummariesRoute,
    getUserProfileRoute,
    getUserSSNRoute,
    changeUserProfileAddressRoute,
    changeUserProfileDobRoute,
    changeUserProfilePersonalNameRoute,
    changeUserPhoneNumberRoute,
    suspendPunterRoute,
    unsuspendPunterRoute,
    logoutPunterRoute,
    getSessionHistoryRoute,
    getLimitsHistoryRoute,
    getPunterCoolOffsHistoryRoute,
    endSelfExclusionPunterRoute,
    updateUserSSNRoute,
    creditFundsRoute,
    debitFundsRoute,
    financialSummaryRoute,
    betHistoryRoute,
    getTransactionsRoute,
    confirmTransactionRoute,
    rejectTransactionRoute,
    exportTransactionsRoute,
    ingestExcludedPuntersRoute,
    exportExcludedPuntersRoute,
    triggerDailyReportsRoute,
    repeatDailyReportsRoute,
    resetPunterStateRoute,
    unlockAccountRoute,
    resetPunterStateRoute,
    accountDeactivationRoute,
    createBackofficeUserRoute)

  private lazy val punterId: PathCapture[PunterId] = path[PunterId]("punterId")
  private lazy val transactionId: PathCapture[TransactionId] = path[TransactionId]("transactionId")
}
