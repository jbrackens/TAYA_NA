package phoenix.reports.domain.definition

import scala.concurrent.Future

import phoenix.reports.domain.definition.Fields.FieldType
import phoenix.reports.domain.definition.ReportDefinition.Report
import phoenix.reports.domain.model.ReportingPeriod

trait ReportDefinition {
  def report(reportingPeriod: ReportingPeriod): Future[Report]
}

object ReportDefinition {
  type RowCells = List[FieldType]

  trait RowType extends Product {
    def getCells: RowCells = productIterator.toList.collect { case field: FieldType => field }
  }

  sealed trait TableColumn {
    def displayName: String
  }

  case class HeadingColumn(displayName: String) extends TableColumn
  case class Column(displayName: String, aggregation: AggregationType = AggregationType.None) extends TableColumn

  sealed trait AggregationType

  object AggregationType {
    case object None extends AggregationType

    /**
     * Allowed only on `MoneyField`
     * @see phoenix.reports.application.generator.ReportGenerator.TemplateProcessor#calculateTotals
     */
    case object Sum extends AggregationType
  }

  case class ReportTable(title: Option[String] = None, index: Int, columns: Seq[TableColumn], data: Seq[RowType]) {
    def shouldCalculateTotals: Boolean = {
      columns.collect { case col: Column if col.aggregation != AggregationType.None => col }.nonEmpty
    }

    def dataCells: List[RowCells] = data.map(_.getCells).toList
  }

  case class Report(name: String, tables: Seq[ReportTable])
}
