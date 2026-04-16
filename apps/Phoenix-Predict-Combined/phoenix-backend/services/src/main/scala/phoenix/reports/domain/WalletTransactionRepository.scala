package phoenix.reports.domain

import java.time.OffsetDateTime

import scala.concurrent.Future

import akka.NotUsed
import akka.stream.scaladsl.Source

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.domain.model.wallets.TransactionType
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionId
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

private[reports] trait WalletTransactionRepository {
  def upsert(transaction: WalletTransaction): Future[Unit]
  def setClosedAt(transactionId: TransactionId, closedAt: OffsetDateTime): Future[Unit]
  def findPendingAsOf(reference: OffsetDateTime): Source[WalletTransaction, NotUsed]
  def findAdjustmentsAsOf(startDate: OffsetDateTime, endDate: OffsetDateTime): Source[WalletTransaction, NotUsed]
  // TODO (PHXD-3218): remove after release of PHXD-3115
  def setTransactionReason(transactionId: TransactionId, transactionReason: TransactionReason): Future[Unit]
}

private[reports] final case class WalletTransaction(
    transactionId: TransactionId,
    punterId: PunterId,
    amount: MoneyAmount,
    transactionType: TransactionType,
    transactionReason: TransactionReason,
    startedAt: OffsetDateTime,
    closedAt: Option[OffsetDateTime],
    backofficeUserId: Option[AdminId],
    details: Option[String])
