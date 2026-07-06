package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.PositiveAmount
import phoenix.payments.application.InitiateChequeWithdrawal.InitiateChequeWithdrawalError
import phoenix.payments.application.InitiateChequeWithdrawal.InsufficientFunds
import phoenix.payments.application.InitiateChequeWithdrawal.MissingPunterData
import phoenix.payments.application.InitiateChequeWithdrawal.PunterIsNotAllowedToWithdraw
import phoenix.payments.application.InitiateChequeWithdrawal.TooSmallWithdrawAmount
import phoenix.payments.application.InitiateChequeWithdrawal.UnexpectedError
import phoenix.payments.domain.TransactionId
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WithdrawalReservation
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.PaymentMethod

final class InitiateChequeWithdrawal(punters: PuntersBoundedContext, wallets: WalletsBoundedContext)(implicit
    ec: ExecutionContext) {

  private val preconditions = new WithdrawalPreconditions(punters, wallets)

  def forPunter(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, InitiateChequeWithdrawalError, TransactionId] =
    for {
      _ <- ensurePunterCanWithdraw(punterId, amount.map(_.moneyAmount))
      reservationId <- attemptReservation(punterId, amount)
    } yield TransactionId(reservationId.unwrap)

  private def ensurePunterCanWithdraw(
      punterId: PunterId,
      amount: PositiveAmount[MoneyAmount]): EitherT[Future, InitiateChequeWithdrawalError, Unit] =
    preconditions.assertPunterCanWithdrawAmount(punterId, amount.value).leftMap {
      case _: WithdrawalPreconditions.NotEnoughFunds         => InsufficientFunds
      case _: WithdrawalPreconditions.NotAllowedToWithdraw   => PunterIsNotAllowedToWithdraw
      case _: WithdrawalPreconditions.MissingData            => MissingPunterData
      case _: WithdrawalPreconditions.TooSmallWithdrawAmount => TooSmallWithdrawAmount
    }

  private def attemptReservation(
      punterId: PunterId,
      amount: PositiveAmount[RealMoney]): EitherT[Future, InitiateChequeWithdrawalError, ReservationId] = {
    val reservationId = ReservationId.create()
    val withdrawal = WithdrawalReservation(reservationId, amount, PaymentMethod.ChequeWithdrawalPaymentMethod)

    wallets
      .reserveForWithdrawal(WalletId.deriveFrom(punterId), withdrawal)
      .bimap(
        {
          case _: WalletsBoundedContextProtocol.InsufficientFundsError        => InsufficientFunds
          case _: WalletsBoundedContextProtocol.WalletNotFoundError           => MissingPunterData
          case _: WalletsBoundedContextProtocol.ReservationAlreadyExistsError => UnexpectedError
        },
        _.reservationId)
  }

}

object InitiateChequeWithdrawal {
  sealed trait InitiateChequeWithdrawalError
  final case object MissingPunterData extends InitiateChequeWithdrawalError
  final case object PunterIsNotAllowedToWithdraw extends InitiateChequeWithdrawalError
  final case object InsufficientFunds extends InitiateChequeWithdrawalError
  final case object UnexpectedError extends InitiateChequeWithdrawalError
  final case object TooSmallWithdrawAmount extends InitiateChequeWithdrawalError
}
