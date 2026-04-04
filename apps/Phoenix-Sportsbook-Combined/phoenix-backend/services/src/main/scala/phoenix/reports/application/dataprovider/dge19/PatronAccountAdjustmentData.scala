package phoenix.reports.application.dataprovider.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import akka.stream.Materializer
import akka.stream.scaladsl.Sink

import phoenix.punters.PunterEntity.AdminId
import phoenix.punters.PunterEntity.PunterId
import phoenix.reports.application.PuntersFinder
import phoenix.reports.application.TransactionFinder
import phoenix.reports.domain.WalletTransaction
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.PatronAccountAdjustment.PatronAccountAdjustmentRow
import phoenix.wallets.WalletsBoundedContextProtocol.TransactionReason

final class PatronAccountAdjustmentData(transactionFinder: TransactionFinder, puntersFinder: PuntersFinder)(implicit
    mat: Materializer,
    ec: ExecutionContext)
    extends ReportDataProvider[PatronAccountAdjustmentRow] {
  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[PatronAccountAdjustmentRow]] =
    transactionFinder
      .findAdjustmentsAsOf(reportingPeriod.periodStart, reportingPeriod.periodEnd)
      .mapAsync(10)(transaction => buildReportRow(reportingPeriod, transaction))
      .runWith(Sink.collection)

  private def buildReportRow(
      reportingPeriod: ReportingPeriod,
      transaction: WalletTransaction): Future[PatronAccountAdjustmentRow] =
    for {
      punterProfile <- puntersFinder.find(transaction.punterId)
      adminProfile <- puntersFinder.find(toPunterId(transaction.backofficeUserId.get))
      cashableAmount = transaction.transactionReason match {
        case TransactionReason.AdjustingFundsWithdrawn => -transaction.amount.amount
        case _                                         => transaction.amount.amount
      }
    } yield PatronAccountAdjustmentRow(
      gamingDate = DateField(reportingPeriod.periodStart),
      patronName = StringField(punterProfile.punterName),
      patronId = PatronIdField(transaction.punterId),
      accountDesignation = AccountDesignationField(punterProfile.designation()),
      transactionTime = TimeField(transaction.startedAt),
      adjusterName = StringField(adminProfile.punterName),
      adjustmentReason = StringField(transaction.details.getOrElse("")),
      cashableAmount = MoneyField(cashableAmount),
      nonCashableAmount = MoneyField(0) // Not implemented. See PHXD-2943
    )
  private def toPunterId(adminId: AdminId): PunterId = PunterId(adminId.value)

}
