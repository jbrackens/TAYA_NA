package stella.wallet.db.transaction

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.wallet.models.transaction.Transaction

trait TransactionWriteRepository {
  def persist(transaction: Transaction)(implicit ec: ExecutionContext): Future[Unit]
}
