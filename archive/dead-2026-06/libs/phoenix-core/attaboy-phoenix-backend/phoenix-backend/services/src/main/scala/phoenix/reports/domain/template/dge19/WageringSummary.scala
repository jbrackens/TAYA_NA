package phoenix.reports.domain.template.dge19

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.DateField
import phoenix.reports.domain.definition.Fields.MoneyField
import phoenix.reports.domain.definition.Fields.SportDisciplineField
import phoenix.reports.domain.definition.Fields.StringField
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType.Sum
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod
import phoenix.reports.domain.template.ReportDataProvider
import phoenix.reports.domain.template.dge19.WageringSummary.WageringSummarySportsRow

final class WageringSummary(dataProvider: ReportDataProvider[WageringSummarySportsRow])(implicit ec: ExecutionContext)
    extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] = {
    val rows = dataProvider.getData(reportingPeriod)
    rows.map(prepareReport)
  }

  private def prepareReport(sportsData: Seq[WageringSummarySportsRow]): Report =
    Report(
      name = "Wagering Summary Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          title = Some("Sports Pool"),
          columns = Seq(
            HeadingColumn(displayName = "Gaming Date"),
            Column(displayName = "Event Name"),
            Column(displayName = "Event Type"),
            //TODO (PHXD-1445): should we keep transfer to/from next to each other also in `Casino Games` section and in `PatronAccountSummary` ?
            Column(displayName = "Transfers To Sports", aggregation = Sum),
            Column(displayName = "Transfers From Sports", aggregation = Sum),
            Column(displayName = "Cancel Sports Wagers", aggregation = Sum),
            Column(displayName = "Void Sports Wagers", aggregation = Sum),
            Column(displayName = "Resettled Sports Wager", aggregation = Sum),
            Column(displayName = "Sports Win/Loss", aggregation = Sum)),
          data = sportsData)))
}

object WageringSummary {

  final case class WageringSummarySportsRow(
      gamingDate: DateField,
      eventName: StringField,
      eventType: SportDisciplineField,
      transfersToSports: MoneyField,
      transfersFromSports: MoneyField,
      cancelSportsWagers: MoneyField,
      voidSportsWagers: MoneyField,
      resettledSportsWager: MoneyField,
      sportsWinLoss: MoneyField)
      extends RowType
}
