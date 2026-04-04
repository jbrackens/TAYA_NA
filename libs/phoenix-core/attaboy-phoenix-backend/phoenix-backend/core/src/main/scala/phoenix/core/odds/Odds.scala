package phoenix.core.odds

import scala.math.BigDecimal.RoundingMode

/**
 * Represents the odds in Decimal form (linked to a Selection from a Market)
 */
final case class Odds(value: BigDecimal) {
  require(
    value >= Odds.MinValue && value < Odds.MaxValue,
    s"Invalid decimal odds value $value, must be [${Odds.MinValue}, ${Odds.MaxValue})")

  def *(number: BigDecimal): Odds =
    Odds(((value - 1) * number) + 1)

  def /(number: BigDecimal): Odds =
    Odds(((value - 1) / number) + 1)

  def toAmericanOdds: AmericanOdds = AmericanOdds.fromDecimal(this)

  def toFractionalOdds: FractionalOdds = FractionalOdds.fromDecimal(this)
}

object Odds {
  private val precision = 4
  val MinValue: BigDecimal = scale(BigDecimal(1.01))
  val MaxValue: BigDecimal = scale(BigDecimal(1000))

  implicit val ordering: Ordering[Odds] = Ordering.by(_.value)

  def apply(value: BigDecimal): Odds = new Odds(fixOddinRoundingDown(scale(value)))

  def apply(value: Double): Odds = apply(BigDecimal(value))

  /**
   * Oddin have told us that odds can be 1.00 for an outcome, even if the other
   * outcome in a binary market is still as short as 11/1.
   * So we are pinning the value to not quite be a logical certainty in these
   * situations. The value we choose is 1.01.
   */
  private def fixOddinRoundingDown(value: BigDecimal): BigDecimal = {
    if (value >= 1 && value < MinValue) MinValue
    else value
  }

  private def scale(value: BigDecimal): BigDecimal = value.setScale(precision, RoundingMode.HALF_UP)
}
