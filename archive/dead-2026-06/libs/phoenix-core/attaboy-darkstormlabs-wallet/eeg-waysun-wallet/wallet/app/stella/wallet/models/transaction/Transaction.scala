package stella.wallet.models.transaction

import java.time.OffsetDateTime

import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.CurrencyId._
import stella.wallet.models.Ids.ProjectIdInstances._
import stella.wallet.models.Ids.UserIdInstances._
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.models.wallet.PositiveBigDecimal._

final case class Transaction(
    transactionType: TransactionType,
    currencyId: CurrencyId,
    amount: BigDecimal,
    exchangeToCurrencyId: Option[CurrencyId],
    exchangeRate: Option[PositiveBigDecimal],
    projectId: ProjectId,
    walletOwnerId: UserId,
    requesterId: UserId,
    externalTransactionId: Option[String],
    title: Option[String],
    transactionDate: OffsetDateTime)

object Transaction {

  def forTopUp(
      currencyId: CurrencyId,
      amount: PositiveBigDecimal,
      projectId: ProjectId,
      walletOwnerId: UserId,
      requesterId: UserId,
      externalTransactionId: String,
      title: String,
      transactionDate: OffsetDateTime): Transaction = Transaction(
    TransactionType.TopUp,
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

  def forWithdraw(
      currencyId: CurrencyId,
      amount: BigDecimal,
      projectId: ProjectId,
      walletOwnerId: UserId,
      requesterId: UserId,
      externalTransactionId: String,
      title: String,
      transactionDate: OffsetDateTime): Transaction = {
    require(amount < 0, "Amount needs to be lower than 0")
    Transaction(
      TransactionType.Withdraw,
      currencyId,
      amount,
      exchangeToCurrencyId = None,
      exchangeRate = None,
      projectId,
      walletOwnerId,
      requesterId,
      Some(externalTransactionId),
      Some(title),
      transactionDate)
  }

  implicit lazy val transactionFormat: RootJsonFormat[Transaction] = jsonFormat11(Transaction.apply)

  implicit lazy val transactionSchema: Schema[Transaction] = Schema
    .derived[Transaction]
    .modify(_.walletOwnerId)(_.encodedExample("79a85f64-5717-4562-b3fc-2c963f66afa6"))
    .modify(_.requesterId)(_.encodedExample("2ca85f64-5717-4562-b3fc-2c963f66afa6"))
    .modify(_.externalTransactionId)(_.encodedExample("INV/01/02/2022-pmnt01"))
    .modify(_.title)(_.encodedExample("Payment via credit card"))
}
