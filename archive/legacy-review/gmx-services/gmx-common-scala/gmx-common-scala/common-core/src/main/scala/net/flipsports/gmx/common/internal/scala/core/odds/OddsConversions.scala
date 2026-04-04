package net.flipsports.gmx.common.internal.scala.core.odds

trait OddsConversions {
  def fractionalToPercentage(in: Double): Double = {
    (100 / in) / 100
  }

  def percentageToFractional(in: Double): Double = {
    1.0 / in
  }

  def scaleTwoRoundDown(result: Double) = {
    BigDecimal(result).setScale(2, BigDecimal.RoundingMode.HALF_DOWN).toDouble
  }
}

object OddsConversions extends OddsConversions
