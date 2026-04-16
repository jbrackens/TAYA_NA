package phoenix.reports.application.generator

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import com.norbitltd.spoiwo.model.Row
import com.norbitltd.spoiwo.model.Sheet
import com.norbitltd.spoiwo.model.{Column => SheetColumn}

import phoenix.core.Clock
import phoenix.reports.domain.definition.Fields._
import phoenix.reports.domain.definition.ReportDefinition
import phoenix.reports.domain.definition.ReportDefinition.AggregationType
import phoenix.reports.domain.definition.ReportDefinition.Column
import phoenix.reports.domain.definition.ReportDefinition.HeadingColumn
import phoenix.reports.domain.definition.ReportDefinition.Report
import phoenix.reports.domain.definition.ReportDefinition.ReportTable
import phoenix.reports.domain.definition.ReportDefinition.RowCells
import phoenix.reports.domain.model.ReportingPeriod

private[reports] final class ReportGenerator(implicit ec: ExecutionContext) {
  def generate(reportingPeriod: ReportingPeriod, definition: ReportDefinition, clock: Clock): Future[Sheet] =
    definition.report(reportingPeriod).map(report => new TemplateProcessor(report, clock).build(reportingPeriod))
}

private class TemplateProcessor(report: Report, clock: Clock) {
  private val rowBuilder = RowBuilder(clock)

  /* Type need to be Any to dynamic proper cell formatting otherwise we need to specify direct types */
  // TODO (PHXD-1088): When the source data becomes so large that we can't fit it all into memory, we'll need to perform a refactor here
  def build(reportingPeriod: ReportingPeriod): Sheet = {
    val reportHeader: Seq[Row] = buildReportHeader(reportingPeriod)
    val tables: Seq[TableWithData] = report.tables.map(buildTable).sortBy(_.index)
    val sheetColumns: Seq[SheetColumn] = tables.flatMap(_.columns).distinct
    val sheetRows: Seq[Row] = tables.flatMap(_.rows)

    prepareEmptySheet().withColumns(sheetColumns.toList).addRows(reportHeader ++ sheetRows)
  }

  private def buildReportHeader(reportingPeriod: ReportingPeriod): Seq[Row] = {
    Seq(
      rowBuilder.emptyRow(),
      rowBuilder.emptyRow(),
      rowBuilder.withStringCellValues(report.name),
      rowBuilder.withStringCellValues {
        val gamingDate = DateTimeFormats.formatDate(clock.adjustToClockZone(reportingPeriod.periodStart))
        s"Gaming Date: $gamingDate"
      },
      rowBuilder.withStringCellValues(s"Platform: DARKSTORMLABS"),
      rowBuilder.emptyRow(),
      rowBuilder.emptyRow())
  }

  private def buildTable(reportTable: ReportTable): TableWithData = {
    val title: Seq[Row] = reportTable.title.map(rowBuilder.withStringCellValues(_)).toList
    val tableHeader: Seq[Row] = Seq(rowBuilder.withStringCellValues(reportTable.columns.toList.map(_.displayName)))
    val dataRows: Seq[Row] = buildDataRows(reportTable)
    val footer: Seq[Row] = Seq(rowBuilder.emptyRow(), rowBuilder.emptyRow())

    val columns = buildColumns(reportTable)
    val rows = title ++ tableHeader ++ dataRows ++ footer
    TableWithData(reportTable.index, columns, rows)
  }

  private def buildDataRows(reportTable: ReportTable): List[Row] =
    if (reportTable.data.isEmpty)
      List(noActivityRow)
    else {
      val dataRows = reportTable.dataCells
      if (reportTable.shouldCalculateTotals)
        buildRows(dataRows :+ calculateTotals(reportTable, dataRows))
      else
        buildRows(dataRows)
    }

  private def calculateTotals(reportTable: ReportTable, dataRows: Seq[RowCells]): RowCells = {
    reportTable.columns.zipWithIndex.map {
      case (_: HeadingColumn, _)                => StringField("Totals")
      case (Column(_, AggregationType.None), _) => StringField("")
      case (Column(_, AggregationType.Sum), index) =>
        MoneyField(dataRows.map(row => row(index).asInstanceOf[MoneyField].value).sum)
    }.toList
  }

  private def buildRows(dataRows: List[RowCells]): List[Row] =
    dataRows.map(rowBuilder.withCellValues)

  private def buildColumns(reportTable: ReportTable): Seq[SheetColumn] =
    reportTable.columns.indices.map(index => SheetColumn(index = index, autoSized = true))

  private def prepareEmptySheet(): Sheet = Sheet(report.name)
  private lazy val noActivityRow = rowBuilder.withStringCellValues("No Activity")
}

private final case class TableWithData(index: Int, columns: Seq[SheetColumn], rows: Seq[Row])
