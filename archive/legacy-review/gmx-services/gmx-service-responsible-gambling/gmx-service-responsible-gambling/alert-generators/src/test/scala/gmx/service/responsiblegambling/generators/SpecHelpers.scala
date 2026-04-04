package gmx.service.responsiblegambling.generators

import java.util.concurrent.TimeUnit

import gmx.data.{ CasinoBetPlaced, SportsBetPlaced }
import gmx.dataapi.internal.customer.CustomerLoggedOut
import gmx.dataapi.internal.bet.AverageSportsBetLiabilityChanged

trait SpecHelpers {

  val Alice = "Alice"
  val Bob   = "Bob"

  def sportsBetPlacedAt(customerId: String, time: Long): SportsBetPlaced =
    sportsBetPlacedAt(customerId, time, 550)

  def sportsBetPlacedAt(customerId: String, time: Long, liability: BigDecimal): SportsBetPlaced =
    SportsBetPlaced(customerId, "foo", "foo", "foo", "foo", "foo", liability.toString(), time, 0f)

  def casinoBetPlacedAt(customerId: String, time: Long): CasinoBetPlaced =
    CasinoBetPlaced(customerId, "foo", "foo", "200.0000", time, "foo")

  def customerLogoutAt(customerId: String, time: Long): CustomerLoggedOut =
    CustomerLoggedOut("blah", 0, 0, "", customerId, time)

  def sportsBetAverageLiability(avg: BigDecimal): AverageSportsBetLiabilityChanged =
    AverageSportsBetLiabilityChanged(avg.toString(), 0)

  def minutes(min: Int): Long =
    TimeUnit.MINUTES.toMillis(min)
}
