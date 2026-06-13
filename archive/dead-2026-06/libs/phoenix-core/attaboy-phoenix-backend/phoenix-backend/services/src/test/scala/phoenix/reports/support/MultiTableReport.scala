package phoenix.reports.support

import scala.concurrent.Future

import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition._
import phoenix.reports.domain.model.ReportingPeriod

final class MultiTableReport extends ReportDefinition {

  override def report(reportingPeriod: ReportingPeriod): Future[Report] =
    Future.successful(prepareReport())

  private def prepareReport(): Report =
    Report(
      name = "MultiTable Report",
      Seq[ReportTable](
        ReportTable(
          index = 0,
          columns = Seq(Column(displayName = "Column A"), Column(displayName = "Column B")),
          data = Seq()),
        ReportTable(
          index = 1,
          columns =
            Seq(Column(displayName = "Column 1"), Column(displayName = "Column 2"), Column(displayName = "Column 3")),
          data = Seq())))
}
