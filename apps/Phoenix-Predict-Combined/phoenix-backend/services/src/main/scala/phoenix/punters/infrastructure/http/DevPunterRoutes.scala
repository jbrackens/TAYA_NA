package phoenix.punters.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode
import sttp.tapir.EndpointInput.PathCapture
import sttp.tapir._
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum
import sttp.tapir.generic.auto._
import sttp.tapir.model.UsernamePassword

import phoenix.core.Clock
import phoenix.core.error.ErrorDetails
import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationError
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.core.TapirAuthDirectives.basicAuthEndpoint
import phoenix.http.routes.HttpBody.jsonBody
import phoenix.http.routes.dev.DevRoutesConfiguration
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersDomainConfig
import phoenix.punters.application.signup.TestAccountSignUp
import phoenix.punters.application.signup.TestAccountSignUpError
import phoenix.punters.domain.AuthenticationRepository
import phoenix.punters.domain.PuntersRepository
import phoenix.punters.domain.TermsAndConditionsRepository
import phoenix.punters.infrastructure.PunterJsonFormats._
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.CreditFundsRequest
import phoenix.punters.infrastructure.http.PunterTapirEndpoints.TestAccountSignUpRequest
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.CreditFundsReason
import phoenix.wallets.domain.PaymentMethod.NotApplicablePaymentMethod

final class DevPunterRoutes(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext,
    authenticationRepository: AuthenticationRepository,
    puntersRepository: PuntersRepository,
    termsAndConditionsRepository: TermsAndConditionsRepository,
    devRoutesConfiguration: DevRoutesConfiguration,
    clock: Clock,
    puntersDomainConfig: PuntersDomainConfig)(implicit ec: ExecutionContext)
    extends Routes
    with TapirCodecEnumeratum {

  // DO NOT REMOVE. This is necessary for the schemas of simple id-like types to be generated correctly
  // (plain strings rather than objects with `value` field).
  import phoenix.core.currency.CurrencyTapirSchemas._
  import phoenix.punters.infrastructure.http.PunterTapirSchemas._
  import phoenix.punters.infrastructure.http.PunterTapirCodecs._

  private val testAccountSignUp =
    basicAuthEndpoint(
      UsernamePassword(
        devRoutesConfiguration.username.value,
        password = Some(devRoutesConfiguration.password.value))).post
      .in("test-account-sign-up")
      .in(jsonBody[TestAccountSignUpRequest])
      .out(statusCode(StatusCode.NoContent))

  private val testAccountSignUpRoute = testAccountSignUp.serverLogic { _ => signUpRequest =>
    val testAccountSignUpUseCase = {
      new TestAccountSignUp(
        clock,
        authenticationRepository,
        puntersRepository,
        termsAndConditionsRepository,
        punters,
        wallets,
        puntersDomainConfig)
    }

    testAccountSignUpUseCase
      .signUp(signUpRequest)
      .leftMap {
        case TestAccountSignUpError.MaximumAmountOfPuntersCheckNotPassed =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.MaximumAmountOfPuntersCheckNotPassed)
        case TestAccountSignUpError.ForbiddenCharactersInUsername =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InvalidUsername)
        case TestAccountSignUpError.AgeRestrictionNotPassed =>
          ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.AgeRestrictionNotPassed)
        case TestAccountSignUpError.ConflictingPunterInformation | TestAccountSignUpError.SSNAlreadyExists =>
          ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ConflictingPunterInformation)
        case TestAccountSignUpError.PunterProfileAlreadyExists =>
          ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.PunterProfileAlreadyExists)
        case TestAccountSignUpError.WalletAlreadyExists =>
          ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.WalletAlreadyExists)
        case TestAccountSignUpError.IllegalStateError(m) =>
          ErrorResponse.tupled(
            StatusCode.InternalServerError,
            PresentationError(PresentationErrorCode.InternalError, details = Some(ErrorDetails(m))))
        case TestAccountSignUpError.WrongPasswordFormat =>
          ErrorResponse.tupled(StatusCode.Unauthorized, PresentationErrorCode.UnauthorisedResponseDuringLogin)
      }
      .value
  }

  private val depositFunds =
    basicAuthEndpoint(
      UsernamePassword(
        devRoutesConfiguration.username.value,
        password = Some(devRoutesConfiguration.password.value))).post
      .in("punters" / punterId / "funds" / "credit")
      .in(jsonBody[CreditFundsRequest])
      .out(statusCode(StatusCode.NoContent))

  private val depositFundsRoute = depositFunds.serverLogic { _ =>
    {
      case (punterId, request) =>
        wallets
          .deposit(
            WalletId.deriveFrom(punterId),
            request.amount,
            request.reason.getOrElse(CreditFundsReason.Deposit),
            NotApplicablePaymentMethod)
          .bimap(
            (_: WalletNotFoundError) => ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound),
            _ => ())
          .value
    }
  }

  override val endpoints: Routes.Endpoints = List(testAccountSignUpRoute, depositFundsRoute)

  private lazy val punterId: PathCapture[PunterId] = path[PunterId]("punterId")
}
