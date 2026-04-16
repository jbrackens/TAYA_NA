package phoenix.reports.domain.template.aml

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.core.currency.MoneyAmount
import phoenix.punters.PunterEntity.PunterId
import phoenix.punters.PunterState.ActivationPath
import phoenix.reports.domain.definition.Fields.ActivationPathField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.aml.DepositingAccounts.DepositingAccountsReportRow

final class DepositingAccounts(dataProvider: ReportDataProvider[DepositingAccountsReportRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport(reportingPeriod, _))
  }

  private def prepareReport(reportingPeriod: ReportingPeriod, data: Seq[DepositingAccountsReportRow]): Report =
    Report(
      name = s"Patron Account ${nameOfPeriod(reportingPeriod)} Summary Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Account ID"),
            Column(displayName = "KBA status"),
            Column(displayName = "Deposits"),
            Column(displayName = "Withdrawals"),
            Column(displayName = "Lifetime deposits"),
            Column(displayName = "Lifetime withdrawals"),
            Column(displayName = "Sport turnover")),
          data = data)))

  private def nameOfPeriod(reportingPeriod: ReportingPeriod): String =
    reportingPeriod match {
      case ReportingPeriod.Day(_, _)   => "Daily"
      case ReportingPeriod.Week(_, _)  => "Weekly"
      case ReportingPeriod.Month(_, _) => "Monthly"
    }
}

object DepositingAccounts {

  final case class DepositingAccountsReportRow(
      accountId: PatronIdField,
      kbaStatus: ActivationPathField,
      deposits: MoneyField,
      withdrawals: MoneyField,
      lifetimeDeposits: MoneyField,
      lifetimeWithdrawals: MoneyField,
      sportTurnover: MoneyField)
      extends RowType

  object DepositingAccountsReportRow {
    def buildReportRow(
        punterId: PunterId,
        activationPath: ActivationPath,
        puntersDeposits: MoneyAmount,
        puntersWithdrawal: MoneyAmount,
        lifetimeDeposits: MoneyAmount,
        lifetimeWithdrawals: MoneyAmount,
        turnover: MoneyAmount): DepositingAccountsReportRow =
      DepositingAccountsReportRow(
        accountId = PatronIdField(punterId),
        kbaStatus = ActivationPathField(activationPath),
        deposits = MoneyField(puntersDeposits.amount),
        withdrawals = MoneyField(puntersWithdrawal.amount),
        lifetimeDeposits = MoneyField(lifetimeDeposits.amount),
        lifetimeWithdrawals = MoneyField(lifetimeWithdrawals.amount),
        sportTurnover = MoneyField(turnover.amount))
  }
}
