package phoenix.reports.domain.template.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.AccountDesignationField
import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.PatronIdField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.NonCashableBonusBalance.NonCashableBonusBalanceRow

final class NonCashableBonusBalance(dataProvider: ReportDataProvider[NonCashableBonusBalanceRow])(implicit
    ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(data: Seq[NonCashableBonusBalanceRow]): Report =
    Report(
      name = "Non Cashable Bonus Balance Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Patron ID"),
            Column(displayName = "Account Designation (Real or Test)"),
            Column(displayName = "Bonus Beginning Balance", aggregation = Sum),
            Column(displayName = "Bonus Manual Adjustment", aggregation = Sum),
            Column(displayName = "Non Cashable Bonus Awarded", aggregation = Sum),
            Column(displayName = "Bonus Wagered", aggregation = Sum),
            Column(displayName = "Canceled/Voided Bonus Wager", aggregation = Sum),
            Column(displayName = "Resettled Bonus Wager", aggregation = Sum),
            Column(displayName = "Bonus Won", aggregation = Sum),
            Column(displayName = "Bonus Expired/Forfeited", aggregation = Sum),
            Column(displayName = "Reclaimed Winnings", aggregation = Sum),
            Column(displayName = "Bonus Converted To Real", aggregation = Sum),
            Column(displayName = "Bonus Ending Balance", aggregation = Sum),
            Column(displayName = "Net Bonus Movement", aggregation = Sum)),
          data = data)))
}

object NonCashableBonusBalance {

  final case class NonCashableBonusBalanceRow(
      gamingDate: DateField,
      patronId: PatronIdField,
      accountDesignation: AccountDesignationField,
      bonusBeginningBalance: MoneyField,
      bonusManualAdjustment: MoneyField,
      nonCashableBonusAwarded: MoneyField,
      bonusWagered: MoneyField,
      canceledVoidedBonusWager: MoneyField,
      resettledBonusWager: MoneyField,
      bonusWon: MoneyField,
      bonusExpiredForfeited: MoneyField,
      reclaimedWinnings: MoneyField,
      bonusConvertedToReal: MoneyField,
      bonusEndingBalance: MoneyField,
      netBonusMovement: MoneyField)
      extends RowType
}
