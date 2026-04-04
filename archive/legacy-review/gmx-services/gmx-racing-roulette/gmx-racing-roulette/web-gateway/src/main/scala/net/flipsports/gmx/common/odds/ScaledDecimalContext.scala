package net.flipsports.gmx.common.odds

class ScaledDecimalContext(precision: Int) {
  private val shiftMultiplier: Int = scala.math.pow(10, precision).intValue()

  def scaleToLong(in: Double): ScaledDecimal = {
    Math.round(shiftDouble(in))
  }

  def shiftDouble(in: Double): Double = {
    in * shiftMultiplier
  }

  def scaleToDouble(in: ScaledDecimal): Double = {
    val moneyDecimal = BigDecimal(in.doubleValue() / shiftMultiplier)
    moneyDecimal.setScale(precision, BigDecimal.RoundingMode.DOWN).toDouble
  }

}
