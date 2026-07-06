package phoenix.payments.application

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.math.Ordered.orderingToOrdered

import cats.data.EitherT

import phoenix.core.currency.MoneyAmount
import phoenix.core.currency.MoneyAmount._
import phoenix.payments.application.DepositPreconditions.DepositLimitsExceeded
import phoenix.payments.application.DepositPreconditions.DepositPreconditionsError
import phoenix.payments.application.DepositPreconditions.MinDepositAmount
import phoenix.payments.application.DepositPreconditions.MissingPunterProfile
import phoenix.payments.application.DepositPreconditions.MissingWallet
import phoenix.payments.application.DepositPreconditions.NotAllowedToDeposit
import phoenix.payments.application.DepositPreconditions.TooSmallDeposit
import phoenix.payments.application.DepositPreconditions.defaultMaxDepositAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PuntersBoundedContext
import phoenix.punters.PuntersBoundedContext.PunterProfileDoesNotExist
import phoenix.punters.domain.CurrentAndNextLimit
import phoenix.punters.domain.CurrentAndNextLimits
import phoenix.punters.domain.DepositLimitAmount
import phoenix.punters.domain.LimitPeriodType
import phoenix.punters.domain.PunterProfile
import phoenix.wallets.WalletsBoundedContext
import phoenix.wallets.WalletsBoundedContextProtocol.WalletId
import phoenix.wallets.WalletsBoundedContextProtocol.WalletNotFoundError
import phoenix.wallets.domain.Deposits
import phoenix.wallets.domain.PeriodDeposits

private[application] final class DepositPreconditions(punters: PuntersBoundedContext, wallets: WalletsBoundedContext)(
    implicit ec: ExecutionContext) {

  def assertPunterCanDepositAmountWithCash(
      id: PunterId,
      amount: MoneyAmount): EitherT[Future, DepositPreconditionsError, Unit] = {
    for {
      _ <- checkMinDepositAmountExceeds(amount)
      _ <- checkMaxDepositAmountExceeds(id, amount)
    } yield ()
  }
  private def checkMinDepositAmountExceeds(amount: MoneyAmount): EitherT[Future, DepositPreconditionsError, Unit] =
    EitherT.cond[Future](amount >= MinDepositAmount, (), TooSmallDeposit(MinDepositAmount))

  def assertPunterCanDepositAmount(
      id: PunterId,
      amount: MoneyAmount): EitherT[Future, DepositPreconditionsError, Unit] =
    checkMaxDepositAmountExceeds(id, amount)

  private def checkMaxDepositAmountExceeds(
      id: PunterId,
      amount: MoneyAmount): EitherT[Future, DepositPreconditionsError, Unit] = {
    for {
      maxDepositAmount <- getPunterProfileAndMaxDeposit(id).map(_._2)
      _ <- checkAmountWithinLimits(id, maxDepositAmount, amount)
    } yield ()
  }

  def getMaxDepositAmount(id: PunterId): EitherT[Future, DepositPreconditionsError, MoneyAmount] =
    getPunterProfileAndMaxDeposit(id).map {
      case (_, maxDepositAmount) => maxDepositAmount
    }

  private def getPunterProfileAndMaxDeposit(
      id: PunterId): EitherT[Future, DepositPreconditionsError, (PunterProfile, MoneyAmount)] =
    for {
      profile <- getPunterProfile(id)
      _ <- checkPunterCanDeposit(id, profile)
      maxDepositAmount <- getMaximumDepositAmount(id, profile)
    } yield (profile, maxDepositAmount)

  private def getPunterProfile(id: PunterId): EitherT[Future, DepositPreconditionsError, PunterProfile] =
    punters.getPunterProfile(id).leftMap((_: PunterProfileDoesNotExist) => MissingPunterProfile(id))

  private def checkPunterCanDeposit(
      id: PunterId,
      punter: PunterProfile): EitherT[Future, DepositPreconditionsError, Unit] =
    EitherT.cond(punter.permissions.canDeposit, (), NotAllowedToDeposit(id))

  private def checkAmountWithinLimits(
      id: PunterId,
      maxDepositAmount: MoneyAmount,
      amount: MoneyAmount): EitherT[Future, DepositPreconditionsError, Unit] =
    EitherT.cond(amount <= maxDepositAmount, (), DepositLimitsExceeded(id))

  private def getMaximumDepositAmount(
      punterId: PunterId,
      punterProfile: PunterProfile): EitherT[Future, DepositPreconditionsError, MoneyAmount] =
    getDepositHistory(WalletId.deriveFrom(punterId)).map(history =>
      calculateMaximumDepositAmount(history, punterProfile.depositLimits))

  private def getDepositHistory(walletId: WalletId): EitherT[Future, DepositPreconditionsError, Deposits] =
    wallets.depositHistory(walletId).leftMap((_: WalletNotFoundError) => MissingWallet(walletId))

  private def calculateMaximumDepositAmount(
      history: Deposits,
      limits: CurrentAndNextLimits[DepositLimitAmount]): MoneyAmount =
    List(
      calculateAmountRemainingForPeriod(limits.daily, history.daily),
      calculateAmountRemainingForPeriod(limits.weekly, history.weekly),
      calculateAmountRemainingForPeriod(limits.monthly, history.monthly)).min

  private def calculateAmountRemainingForPeriod[LT <: LimitPeriodType](
      limit: CurrentAndNextLimit[DepositLimitAmount, LT],
      depositedAmount: PeriodDeposits[LT]): MoneyAmount =
    limit.current.limit.value.getOrElse(defaultMaxDepositAmount).value - depositedAmount.value
}

private[application] object DepositPreconditions {

  val defaultMaxDepositAmount = DepositLimitAmount(MoneyAmount(1000000))
  val MinDepositAmount = MoneyAmount(10)

  sealed trait DepositPreconditionsError {
    def reason: String
  }
  sealed abstract class NotAllowed(override val reason: String) extends DepositPreconditionsError
  final case class DepositLimitsExceeded(id: PunterId)
      extends NotAllowed(s"Deposit limits exceeded for punter [punterId = $id]")
  final case class NotAllowedToDeposit(id: PunterId)
      extends NotAllowed(s"Punter not allowed to deposit [punterId = $id]")
  final case class TooSmallDeposit(min: MoneyAmount)
      extends NotAllowed(s"Punter not allowed to deposit amount less than ${min.amount}")

  sealed abstract class MissingData(override val reason: String) extends DepositPreconditionsError
  final case class MissingPunterProfile(id: PunterId) extends MissingData(s"Punter profile not found [punterId = $id]")
  final case class MissingWallet(id: WalletId)
      extends MissingData(s"Wallet not found [walletId = $id, punterId = ${id.owner}]")
}
