package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.stake

import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.SelectionStatus

import scala.io.Source

case class CalculatorTestCase(aggregated: StakeLine, lines: Seq[StakeLine])

case class StakeLine(id: String, status: Option[SelectionStatus], odds: Double, stake: Double, potentialReturn: Double)


object CalculatorTestCase {
  def fromCSV(resource: String): CalculatorTestCase = {
    val source = Source.fromInputStream(getClass.getResourceAsStream(resource))
    val lines = source.getLines().drop(1)
    val aggregated = parseLine(lines.next())
    CalculatorTestCase(aggregated, lines.map(parseLine).toVector)
  }

  private def parseLine(line: String): StakeLine = {
    val values = line.split(",").map(_.trim)
    StakeLine(values(0), SelectionStatus.withNameOption(values(1)), values(2).toDouble, values(3).toDouble, values(4).toDouble)
  }
}
