package phoenix.payments.domain

import java.util.UUID

import scala.collection.immutable.IndexedSeq
import scala.concurrent.Future

import cats.data.OptionT
import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.UpperSnakecase

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.sharding.PhoenixId
import phoenix.wallets.WalletsBoundedContextProtocol.ReservationId

trait TransactionRepository {
  def upsert(transaction: PaymentTransaction): Future[Unit]
  def find(punterId: PunterId, transactionId: TransactionId): OptionT[Future, PaymentTransaction]
}

final case class TransactionId(value: String) extends PhoenixId {
  def asReservation: ReservationId = ReservationId(value)
}
object TransactionId {
  def apply(uuid: UUID): TransactionId = new TransactionId(uuid.toString)
}

sealed trait TransactionStatus extends EnumEntry with UpperSnakecase
object TransactionStatus extends Enum[TransactionStatus] {
  override def values: IndexedSeq[TransactionStatus] = findValues

  case object Initiated extends TransactionStatus
  case object Pending extends TransactionStatus
  case object Succeeded extends TransactionStatus
  case object Cancelled extends TransactionStatus
  case object Failed extends TransactionStatus
  case object Refused extends TransactionStatus
  case object Interrupted extends TransactionStatus
}

final case class PaymentTransaction(
    transactionId: TransactionId,
    punterId: PunterId,
    direction: PaymentDirection,
    amount: MoneyAmount,
    status: TransactionStatus)

object PaymentTransaction {
  def create(
      punterId: PunterId,
      transactionId: TransactionId,
      direction: PaymentDirection,
      amount: MoneyAmount): PaymentTransaction =
    PaymentTransaction(transactionId, punterId, direction, amount, status = TransactionStatus.Initiated)
}
