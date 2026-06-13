package phoenix.payments.application

import scala.concurrent.Future

import cats.data.OptionT

import phoenix.payments.domain.PaymentTransaction
import phoenix.payments.domain.TransactionId
import phoenix.payments.domain.TransactionRepository
import phoenix.punters.PunterEntity.PunterId

final class GetTransactionDetails(transactions: TransactionRepository) {
  def findTransaction(punterId: PunterId, transactionId: TransactionId): OptionT[Future, PaymentTransaction] =
    transactions.find(punterId, transactionId)
}
