package phoenix.wallets

import java.time.OffsetDateTime

import cats.kernel.Monoid

import phoenix.core.currency.DefaultCurrencyMoney
import phoenix.core.currency.MoneyAmount
import phoenix.wallets.WalletsBoundedContextProtocol._
import phoenix.wallets.domain.Deposit
import phoenix.wallets.domain.DepositHistory
import phoenix.wallets.domain.Funds
import phoenix.wallets.domain.Funds.BonusFunds
import phoenix.wallets.domain.Funds.RealMoney
import phoenix.wallets.domain.ResponsibilityCheckStatus
import phoenix.wallets.infrastructure.akka.WalletsAkkaSerializable

object WalletState {

  sealed trait WalletState extends WalletsAkkaSerializable {
    def asActive: ActiveWallet = asInstanceOf[ActiveWallet]
  }

  final case object Uninitialized extends WalletState

  case class ActiveWallet(
      walletId: WalletId,
      balance: Balance,
      bets: Map[ReservationId, Bet],
      withdrawals: Map[ReservationId, WithdrawalReservation],
      depositHistory: DepositHistory,
      responsibilityCheckStatus: ResponsibilityCheckStatus)
      extends WalletState {

    def deposit(funds: Funds, depositedAt: OffsetDateTime): ActiveWallet =
      funds match {
        case RealMoney(DefaultCurrencyMoney(amount, _)) =>
          addFunds(funds).copy(depositHistory = depositHistory.withDeposit(Deposit(MoneyAmount(amount), depositedAt)))
        case _: RealMoney | _: BonusFunds => addFunds(funds)
      }

    def hasReservedFunds(reservationId: ReservationId): Boolean =
      bets.contains(reservationId) || withdrawals.contains(reservationId)

    def reserveFunds(reservationId: ReservationId, bet: Bet): ActiveWallet =
      withdraw(bet.stake).copy(bets = bets + (reservationId -> bet))

    def reserveFunds(reservation: WithdrawalReservation): ActiveWallet =
      withdraw(reservation.funds.value).copy(withdrawals = withdrawals + (reservation.reservationId -> reservation))

    def onWithdrawalConfirmed(reservationId: ReservationId): ActiveWallet = {
      val _ = findWithdrawalReservation(reservationId)
      removeWithdrawalReservation(reservationId)
    }

    def onWithdrawalCancelled(reservationId: ReservationId): ActiveWallet = {
      val withdrawalReservation = findWithdrawalReservation(reservationId)
      addFunds(withdrawalReservation.funds.value).removeWithdrawalReservation(reservationId)
    }

    def onBetVoided(reservationId: ReservationId): ActiveWallet = {
      val betReservation = findBetReservation(reservationId)
      addFunds(betReservation.stake).removeBetReservation(reservationId)
    }

    def onBetPushed(reservationId: ReservationId): ActiveWallet = {
      val betReservation = findBetReservation(reservationId)
      addFunds(betReservation.stake).removeBetReservation(reservationId)
    }

    def onBetCancelled(reservationId: ReservationId): ActiveWallet = {
      val betReservation = findBetReservation(reservationId)
      addFunds(betReservation.stake).removeBetReservation(reservationId)
    }

    def onBetWon(reservationId: ReservationId): ActiveWallet = {
      val betReservation = findBetReservation(reservationId)
      addFunds(betReservation.winnerFunds).removeBetReservation(reservationId)
    }

    def onBetLost(reservationId: ReservationId): ActiveWallet = {
      val _ = findBetReservation(reservationId)
      removeBetReservation(reservationId)
    }

    def onResponsibilityCheckAccepted(): ActiveWallet =
      copy(responsibilityCheckStatus = ResponsibilityCheckStatus.NoActionNeeded)

    def onResponsibilityCheckAcceptanceRequested(): ActiveWallet =
      copy(responsibilityCheckStatus = ResponsibilityCheckStatus.NeedsToBeAccepted)

    def forceResponsibilityCheck(): ActiveWallet =
      copy(responsibilityCheckStatus = ResponsibilityCheckStatus.NeedsToBeAccepted)

    def onBetResettled(delta: MoneyAmount): ActiveWallet = {
      addFunds(RealMoney(delta))
    }

    private def addFunds(funds: Funds): ActiveWallet =
      copy(balance = balance + funds)

    private def removeBetReservation(reservationId: ReservationId): ActiveWallet =
      copy(bets = bets - reservationId)

    private def removeWithdrawalReservation(reservationId: ReservationId): ActiveWallet =
      copy(withdrawals = withdrawals - reservationId)

    def canWithdraw(funds: RealMoney): Boolean =
      balance.realMoney.value.amount >= funds.value.amount

    def withdraw(funds: RealMoney): ActiveWallet = {
      val afterWithdrawal = balance.realMoney - funds
      copy(balance = balance.copy(realMoney = afterWithdrawal))
    }

    def findBetReservation(reservationId: ReservationId): Bet =
      bets(reservationId)

    def findWithdrawalReservation(reservationId: ReservationId): WithdrawalReservation =
      withdrawals(reservationId)

    def accountBalance: AccountBalance =
      AccountBalance(available = balance.realMoney.moneyAmount, BlockedFunds(reservedForBets, reservedForWithdrawal))

    private def reservedForBets: MoneyAmount =
      Monoid.combineAll(bets.values.map(_.stake.moneyAmount))

    private def reservedForWithdrawal: MoneyAmount =
      Monoid.combineAll(withdrawals.values.map(_.funds.value.moneyAmount))
  }

  def initial(walletId: WalletId, balance: Balance): ActiveWallet =
    ActiveWallet(
      walletId = walletId,
      balance = balance,
      bets = Map.empty,
      withdrawals = Map.empty,
      depositHistory = DepositHistory.empty,
      responsibilityCheckStatus = ResponsibilityCheckStatus.NoActionNeeded)
}
