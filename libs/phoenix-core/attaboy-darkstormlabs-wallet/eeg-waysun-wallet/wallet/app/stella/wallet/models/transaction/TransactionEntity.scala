package stella.wallet.models.transaction

import java.time.OffsetDateTime

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.LowerCamelcase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.Ids.TransactionId
import stella.wallet.models.wallet.PositiveBigDecimal

final case class TransactionEntity(
    id: TransactionId,
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
    transactionDate: OffsetDateTime,
    createdAt: OffsetDateTime) {

  def toTransaction: Transaction = Transaction(
    transactionType,
    currencyId,
    amount,
    exchangeToCurrencyId,
    exchangeRate,
    projectId,
    walletOwnerId,
    requesterId,
    externalTransactionId,
    title,
    transactionDate)
}

object TransactionEntity {
  def fromTransaction(
      transaction: Transaction,
      transactionId: TransactionId,
      createdAt: OffsetDateTime): TransactionEntity = TransactionEntity(
    transactionId,
    transaction.transactionType,
    transaction.currencyId,
    transaction.amount,
    transaction.exchangeToCurrencyId,
    transaction.exchangeRate,
    transaction.projectId,
    transaction.walletOwnerId,
    transaction.requesterId,
    transaction.externalTransactionId,
    transaction.title,
    transaction.transactionDate,
    createdAt)
}

sealed trait TransactionType extends EnumEntry with LowerCamelcase with TapirCodecEnumeratum

object TransactionType extends Enum[TransactionType] with PlayJsonEnum[TransactionType] {
  def values: IndexedSeq[TransactionType] = findValues

  case object TopUp extends TransactionType
  case object Withdraw extends TransactionType
  case object Exchange extends TransactionType

  implicit lazy val transactionTypeFormat: JsonFormat[TransactionType] = jsonEnumFormat
}
