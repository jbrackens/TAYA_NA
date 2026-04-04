package phoenix.reports.application.dataprovider.dge19

import scala.concurrent.Future

import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.NonCashableBonusBalance.NonCashableBonusBalanceRow

/**
 * Returns aggregated data about bonuses usage in the system.
 *
 * <b>Currently system does not have a concept of bonus, so the empty list is correct and final version.<b/>
 */
final class NonCashableBonusBalanceData extends ReportDataProvider[NonCashableBonusBalanceRow] {
  override def provideData(reportingPeriod: ReportingPeriod): Future[Seq[NonCashableBonusBalanceRow]] =
    Future.successful(Seq())
}
