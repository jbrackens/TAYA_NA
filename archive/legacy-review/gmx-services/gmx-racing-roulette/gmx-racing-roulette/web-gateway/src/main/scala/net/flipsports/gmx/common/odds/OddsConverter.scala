package net.flipsports.gmx.common.odds

trait OddsConverter {

  val FRACTIONAL = new ScaledDecimalContext(2)
  val PERCENTAGE = new ScaledDecimalContext(4)
  val MONEY = new ScaledDecimalContext(2)

  def fractionalToPercentage(in: ScaledDecimal): ScaledDecimal = {
    val fraction = FRACTIONAL.shiftDouble(100d / in)
    Math.round(PERCENTAGE.shiftDouble(fraction / 100d))
  }

  def percentageToFractional(in: ScaledDecimal): ScaledDecimal = {
    val fraction = PERCENTAGE.shiftDouble(1d / in)
    Math.round(FRACTIONAL.shiftDouble(fraction))
  }

  def divideScaledDecimals(numerator: ScaledDecimal, denominator: ScaledDecimal): ScaledDecimal = {
    Math.round(numerator.toDouble / denominator)
  }
}
