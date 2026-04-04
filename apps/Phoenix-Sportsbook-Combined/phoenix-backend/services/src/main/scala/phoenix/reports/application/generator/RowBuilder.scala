package phoenix.reports.application.generator

import com.norbitltd.spoiwo.model.Cell
import com.norbitltd.spoiwo.model.Row

import phoenix.core.Clock
import phoenix.reports.domain.definition.Fields.FieldType
import phoenix.reports.domain.definition.Fields.StringField

private object RowBuilder {
  def apply(clock: Clock): RowBuilder = new RowBuilder(clock)
}

private final class RowBuilder private (clock: Clock) {
  private val cellBuilder = CellBuilder(clock)

  def emptyRow(): Row = Row()

  def withCells(cells: List[Cell]): Row = emptyRow().withCells(cells)

  def withCellValues(values: List[FieldType]): Row =
    withCells(values.map(cellBuilder.buildCell))

  def withStringCellValues(values: String*): Row =
    withStringCellValues(values.toList)

  def withStringCellValues(values: List[String]): Row =
    withCellValues(values.map(StringField))
}
