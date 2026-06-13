package stella.wallet.services

import java.time.OffsetDateTime

import akka.actor.typed.ActorRef

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.StellaCirceAkkaSerializable
import stella.wallet.models.transaction.Transaction
import stella.wallet.models.transaction.TransactionType.TopUp
import stella.wallet.models.transaction.TransactionType.Withdraw
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.services.WalletActorProtocol.WalletCommand._
import stella.wallet.services.WalletActorProtocol.WalletResponse._

object WalletActorProtocol {

  sealed trait WalletCommand extends StellaCirceAkkaSerializable

  object WalletCommand {
    final case class TopUpFunds(
        currencyId: CurrencyId,
        amount: PositiveBigDecimal,
        projectId: ProjectId,
        walletOwnerId: UserId,
        requesterId: UserId,
        externalTransactionId: String,
        title: String,
        replyTo: ActorRef[TopUpFundsResponse])
        extends WalletCommand

    final case class WithdrawFunds(
        currencyId: CurrencyId,
        amount: PositiveBigDecimal,
        projectId: ProjectId,
        walletOwnerId: UserId,
        requesterId: UserId,
        externalTransactionId: String,
        title: String,
        replyTo: ActorRef[WithdrawFundsResponse])
        extends WalletCommand

    final case class GetBalances(replyTo: ActorRef[GetBalancesResponse]) extends WalletCommand

    final case class GetBalance(currencyId: CurrencyId, replyTo: ActorRef[GetBalanceResponse]) extends WalletCommand

    // TODO (SP-92): allow to exchange currencies; bellow there's a proposal how I'd see this (Michal)
    // it's super simple when having all currencies in one wallet and the exchange rates e.g. in Postgres
//    final case class ExchangeCurrency(
//        fromCurrencyId: SerializableCurrencyId,
//        fromCurrencyAmount: PositiveBigDecimal,
//        toCurrencyId: SerializableCurrencyId,
//        exchangeRate: PositiveBigDecimal,
//        projectId: ProjectId,
//        walletOwnerId: UserId,
//        requesterId: UserId,
//        replyTo: ActorRef[GetBalanceInCurrencyResponse])
//        extends WalletCommand {
//      require(
//        fromCurrencyId != toCurrencyId,
//        s"Currencies to exchange should be different but both currencies were ${fromCurrencyId.value}")
//    }
  }

  sealed trait WalletEvent extends StellaCirceAkkaSerializable

  object WalletEvent {
    final case class FundsAdded(
        currencyId: CurrencyId,
        amount: PositiveBigDecimal,
        projectId: ProjectId,
        walletOwnerId: UserId,
        requesterId: UserId,
        externalTransactionId: String,
        title: String,
        transactionDate: OffsetDateTime)
        extends WalletEvent {

      def toTransaction: Transaction = Transaction(
        TopUp,
        currencyId,
        amount.value,
        exchangeToCurrencyId = None,
        exchangeRate = None,
        projectId,
        walletOwnerId,
        requesterId,
        Some(externalTransactionId),
        Some(title),
        transactionDate)
    }

    object FundsAdded {
      def fromCommand(command: TopUpFunds, transactionDate: OffsetDateTime): FundsAdded = FundsAdded(
        command.currencyId,
        command.amount,
        command.projectId,
        command.walletOwnerId,
        command.requesterId,
        command.externalTransactionId,
        command.title,
        transactionDate)
    }

    final case class FundsSubtracted(
        currencyId: CurrencyId,
        amount: PositiveBigDecimal,
        projectId: ProjectId,
        walletOwnerId: UserId,
        requesterId: UserId,
        externalTransactionId: String,
        title: String,
        transactionDate: OffsetDateTime)
        extends WalletEvent {

      def toTransaction: Transaction = Transaction(
        Withdraw,
        currencyId,
        -amount.value,
        exchangeToCurrencyId = None,
        exchangeRate = None,
        projectId,
        walletOwnerId,
        requesterId,
        Some(externalTransactionId),
        Some(title),
        transactionDate)
    }

    object FundsSubtracted {
      def fromCommand(command: WithdrawFunds, transactionDate: OffsetDateTime): FundsSubtracted = FundsSubtracted(
        command.currencyId,
        command.amount,
        command.projectId,
        command.walletOwnerId,
        command.requesterId,
        command.externalTransactionId,
        command.title,
        transactionDate)
    }
  }

  sealed trait WalletResponse extends StellaCirceAkkaSerializable

  object WalletResponse {
    sealed trait TopUpFundsResponse extends WalletResponse

    sealed trait WithdrawFundsResponse extends WalletResponse

    sealed trait GetBalancesResponse extends WalletResponse

    sealed trait GetBalanceResponse extends WalletResponse

    case object TopUpFundsSucceeded extends TopUpFundsResponse

    case object WithdrawFundsSucceeded extends WithdrawFundsResponse

    case object InsufficientFunds extends WithdrawFundsResponse

    final case class GetBalancesValue(balance: Map[CurrencyId, BigDecimal]) extends GetBalancesResponse

    final case class GetBalanceValue(balance: BigDecimal) extends GetBalanceResponse

    case object BalanceForCurrencyNotFound extends GetBalanceResponse
  }
}
