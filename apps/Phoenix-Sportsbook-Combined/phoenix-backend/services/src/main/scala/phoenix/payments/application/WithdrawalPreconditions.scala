package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import cats.data.EitherT

import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.MoneyAmount._
import phoenix.payments.application.WithdrawalPreconditions.MinWithdrawAmount
import phoenix.payments.application.WithdrawalPreconditions.MissingPunterProfile
import phoenix.payments.application.WithdrawalPreconditions.MissingWallet
import phoenix.payments.application.WithdrawalPreconditions.NotAllowedToWithdraw
import phoenix.payments.application.WithdrawalPreconditions.NotEnoughFunds
import phoenix.payments.application.WithdrawalPreconditions.TooSmallWithdrawAmount
import phoenix.payments.application.WithdrawalPreconditions.WithdrawalPreconditionsError
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.domain.PunterProfile
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError

private[application] final class WithdrawalPreconditions(
    punters: PuntersBoundedContext,
    wallets: WalletsBoundedContext)(implicit ec: ExecutionContext) {

  def assertPunterCanWithdrawAmountWithCash(
      id: PunterId,
      amount: MoneyAmount): EitherT[Future, WithdrawalPreconditionsError, Unit] =
    for {
      _ <- EitherT.cond[Future](amount >= MinWithdrawAmount, (), TooSmallWithdrawAmount(MinWithdrawAmount))
      _ <- assertPunterIsPermittedToWithdraw(id)
      _ <- ensureEnoughBalance(id, amount)
    } yield ()

  def assertPunterCanWithdrawAmount(
      id: PunterId,
      amount: MoneyAmount): EitherT[Future, WithdrawalPreconditionsError, Unit] =
    for {
      _ <- assertPunterIsPermittedToWithdraw(id)
      _ <- ensureEnoughBalance(id, amount)
    } yield ()

  private def assertPunterIsPermittedToWithdraw(id: PunterId): EitherT[Future, WithdrawalPreconditionsError, Unit] =
    for {
      profile <- getPunterProfile(id)
      _ <- checkPunterCanWithdraw(id, profile)
    } yield ()

  private def getPunterProfile(id: PunterId): EitherT[Future, WithdrawalPreconditionsError, PunterProfile] =
    punters.getPunterProfile(id).leftMap((_: PunterProfileDoesNotExist) => MissingPunterProfile(id))

  private def checkPunterCanWithdraw(
      id: PunterId,
      punter: PunterProfile): EitherT[Future, WithdrawalPreconditionsError, Unit] =
    EitherT.cond(punter.permissions.canWithdraw, (), NotAllowedToWithdraw(id))

  private def ensureEnoughBalance(
      id: PunterId,
      withdrawalAmount: MoneyAmount): EitherT[Future, WithdrawalPreconditionsError, Unit] = {
    val walletId = WalletId.deriveFrom(id)

    wallets
      .currentBalance(walletId)
      .leftMap[WithdrawalPreconditionsError]((_: WalletNotFoundError) => MissingWallet(walletId))
      .ensure(NotEnoughFunds(id))(_.realMoney.moneyAmount >= withdrawalAmount)
      .map(_ => ())
  }
}

private[application] object WithdrawalPreconditions {
  private val MinWithdrawAmount = MoneyAmount(50)

  sealed trait WithdrawalPreconditionsError {
    def reason: String
  }
  sealed abstract class NotAllowed(override val reason: String) extends WithdrawalPreconditionsError
  final case class NotEnoughFunds(id: PunterId) extends NotAllowed(s"Not enough funds for punter[punterId = $id]")
  final case class NotAllowedToWithdraw(id: PunterId)
      extends NotAllowed(s"Punter not allowed to withdraw [punterId = $id]")
  final case class TooSmallWithdrawAmount(min: MoneyAmount)
      extends NotAllowed(s"Punter not allowed to withdraw amount less than ${min.amount}")

  sealed abstract class MissingData(override val reason: String) extends WithdrawalPreconditionsError
  final case class MissingPunterProfile(id: PunterId) extends MissingData(s"Punter profile not found [punterId = $id]")
  final case class MissingWallet(id: WalletId)
      extends MissingData(s"Wallet not found [walletId = $id, punterId = ${id.owner}]")
}
