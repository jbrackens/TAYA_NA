package stella.wallet.db.transaction

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.transaction.TransactionEntity
import stella.wallet.models.transaction.TransactionType

trait TransactionReadRepository {

  def getTransactionHistory(
      walletOwnerId: UserId,
      currencyId: CurrencyId,
      transactionTypes: Set[TransactionType],
      dateRangeStart: Option[OffsetDateTime],
      dateRangeEnd: Option[OffsetDateTime],
      sortFromNewestToOldest: Boolean)(implicit ec: ExecutionContext): Future[Seq[TransactionEntity]]
}
