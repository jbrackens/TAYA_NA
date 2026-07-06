package phoenix.payments.infrastructure

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.OptionT

import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.punters.PunterEntity.PunterId

final class InMemoryTransactionRepository(implicit ec: ExecutionContext) extends TransactionRepository {
  private var transactions: Map[TransactionId, PaymentTransaction] = Map.empty

  override def upsert(transaction: PaymentTransaction): Future[Unit] =
    Future.successful { transactions = transactions + (transaction.transactionId -> transaction) }

  override def find(punterId: PunterId, transactionId: TransactionId): OptionT[Future, PaymentTransaction] =
    OptionT.fromOption[Future](transactions.get(transactionId)).filter(_.punterId == punterId)
}
