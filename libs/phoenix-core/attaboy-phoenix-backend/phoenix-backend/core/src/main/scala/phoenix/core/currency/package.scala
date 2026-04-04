package phoenix.core

import scala.math.BigDecimal.RoundingMode

package object currency {
  type Amount = BigDecimal

  def formatForDisplay(amount: Amount): String =
    amount.setScale(2, RoundingMode.HALF_UP).toString()
}
