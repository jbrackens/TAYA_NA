package net.flipsports.gmx.streaming.sbtech.mappers.stakecalculators

case class Amount(value: BigDecimal, precision: Int = 8) {

  def adjustTo(precision: BigDecimal): Amount = Amount(value * precision).scale

  def scale(toValues: Amount): Amount = Amount(value * toValues.value).scale

  def scale: Amount = Amount(value.setScale(precision, BigDecimal.RoundingMode.HALF_UP))

  def * (multiplier: Amount): Amount = Amount(value * multiplier.value)

  def / (multiplier: Amount): Amount = Amount(value / multiplier.value)

  def + (multiplier: Amount): Amount = Amount(value + multiplier.value)

  def - (multiplier: Amount): Amount = Amount(value - multiplier.value)

  def >= (lowerLimit: Amount): Boolean =  value >= lowerLimit.value

  def < (lowerLimit: Amount): Boolean =  value < lowerLimit.value

  def asDouble() = value.doubleValue()

  def compare(candidate: Amount): Int = value.compare(candidate.value)

  override def toString: String = asDouble().toString()
}


object Amount {

  val ZERO = Amount(0.0)

  def apply() = new Amount(BigDecimal(0))

  def apply(value: BigDecimal) = new Amount(value)

  def apply(value: Double) = new Amount(value)

  def apply(value: BigDecimal, precision: Int) = new Amount(value, precision)

  def apply(value: Int): Amount = Amount(BigDecimal(value))

  def apply(value: Long): Amount = Amount(BigDecimal(value))
}