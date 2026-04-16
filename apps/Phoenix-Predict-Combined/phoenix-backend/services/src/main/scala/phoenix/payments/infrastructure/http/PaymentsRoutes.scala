package phoenix.payments.infrastructure.http

import scala.concurrent.ExecutionContext

import sttp.model.StatusCode

import phoenix.core.error.ErrorResponse
import phoenix.core.error.PresentationErrorCode
import phoenix.http.core.Routes
import phoenix.http.routes.EndpointInputs.baseUrl.PhoenixAppBaseUrlInput
import phoenix.jwt.JwtAuthenticator
import phoenix.payments.application.CreateCashWithdrawal
import phoenix.payments.application.CreateDeposit
import phoenix.payments.application.CreateWithdrawal
import phoenix.payments.application.GetTransactionDetails
import phoenix.payments.application.InitiateChequeWithdrawal
import phoenix.payments.domain.PaymentOrigin
import phoenix.payments.infrastructure.http.PaymentsTapirEndpoints.ChequeWithdrawalResponse
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.domain.Funds.RealMoney

final class PaymentsRoutes(
    punters: PuntersBoundedContext,
    createWithdrawal: CreateWithdrawal,
    createCashWithdrawal: CreateCashWithdrawal,
    initiateChequeWithdrawal: InitiateChequeWithdrawal,
    createDeposit: CreateDeposit,
    findTransaction: GetTransactionDetails,
    auth: JwtAuthenticator)(implicit ec: ExecutionContext)
    extends Routes {

  val deposit =
    PaymentsTapirEndpoints.deposit(punters, auth).serverLogic { punterId =>
      {
        case (PhoenixAppBaseUrlInput(callerOrigin, _), request) =>
          createDeposit
            .forPunter(punterId, request.amount.map(RealMoney(_)), PaymentOrigin(callerOrigin.value))
            .leftMap {
              case CreateDeposit.PunterIsNotAllowedToDeposit =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotAllowedToDeposit)
              case CreateDeposit.PunterProfileNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
              case CreateDeposit.RegisteredUserNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.RegisteredUserNotFound)
              case CreateDeposit.DepositAmountExceedsLimit =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.DepositAmountExceedsLimit)
              case CreateDeposit.TooSmallDepositAmount =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.TooSmallDepositAmount)
              case CreateDeposit.WalletNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
              case CreateDeposit.PaymentGatewayIssue =>
                ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.PaymentGatewayIssue)
            }
            .value
      }
    }

  val withdrawal =
    PaymentsTapirEndpoints.withdrawal(punters, auth).serverLogic { punterId =>
      {
        case (PhoenixAppBaseUrlInput(callerOrigin, _), request) =>
          createWithdrawal
            .forPunter(punterId, request.amount.map(RealMoney(_)), PaymentOrigin(callerOrigin.value))
            .leftMap {
              case CreateWithdrawal.TooSmallWithdrawAmount =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.TooSmallWithdrawAmount)
              case CreateWithdrawal.PunterIsNotAllowedToWithdraw =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotAllowedToWithdraw)
              case CreateWithdrawal.PunterProfileNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
              case CreateWithdrawal.RegisteredUserNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.RegisteredUserNotFound)
              case CreateWithdrawal.InsufficientFunds =>
                ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InsufficientFunds)
              case CreateWithdrawal.WalletNotFound =>
                ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
              case CreateWithdrawal.PaymentGatewayIssue =>
                ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.PaymentGatewayIssue)
            }
            .value
      }
    }

  val getTransactionDetails =
    PaymentsTapirEndpoints.getTransactionDetails(auth).serverLogic { punterId => transactionId =>
      findTransaction
        .findTransaction(punterId, transactionId)
        .toRight(ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PaymentTransactionDoesNotExist))
        .value
    }

  val cashWithdrawal =
    PaymentsTapirEndpoints.cashWithdrawal(punters, auth).serverLogic { punterId => request =>
      createCashWithdrawal
        .forPunter(punterId, request.amount.map(RealMoney(_)))
        .leftMap {
          case CreateCashWithdrawal.PunterIsNotAllowedToWithdraw =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotAllowedToWithdraw)
          case CreateCashWithdrawal.PunterProfileNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case CreateCashWithdrawal.InsufficientFunds =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InsufficientFunds)
          case CreateCashWithdrawal.WalletNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.WalletNotFound)
          case CreateCashWithdrawal.PaymentGatewayIssue | CreateCashWithdrawal.RollbackError =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.PaymentGatewayIssue)
          case CreateCashWithdrawal.ReservationAlreadyExists =>
            ErrorResponse.tupled(StatusCode.Conflict, PresentationErrorCode.ReservationAlreadyExists)
          case CreateCashWithdrawal.PunterSessionNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.SessionNotFound)
          case CreateCashWithdrawal.RegisteredUserNotFound =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.RegisteredUserNotFound)
          case CreateCashWithdrawal.TooSmallWithdrawAmount =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.TooSmallWithdrawAmount)
        }
        .value
    }

  val chequeWithdrawal =
    PaymentsTapirEndpoints.chequeWithdrawal(punters, auth).serverLogic { punterId => request =>
      initiateChequeWithdrawal
        .forPunter(punterId, request.amount.map(RealMoney(_)))
        .map(ChequeWithdrawalResponse)
        .leftMap {
          case InitiateChequeWithdrawal.MissingPunterData =>
            ErrorResponse.tupled(StatusCode.NotFound, PresentationErrorCode.PunterProfileDoesNotExist)
          case InitiateChequeWithdrawal.InsufficientFunds =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.InsufficientFunds)
          case InitiateChequeWithdrawal.TooSmallWithdrawAmount =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.TooSmallWithdrawAmount)
          case InitiateChequeWithdrawal.PunterIsNotAllowedToWithdraw =>
            ErrorResponse.tupled(StatusCode.BadRequest, PresentationErrorCode.PunterIsNotAllowedToWithdraw)
          case InitiateChequeWithdrawal.UnexpectedError =>
            ErrorResponse.tupled(StatusCode.InternalServerError, PresentationErrorCode.InternalError)
        }
        .value
    }

  override val endpoints: Routes.Endpoints =
    List(deposit, withdrawal, cashWithdrawal, chequeWithdrawal, getTransactionDetails)

}
