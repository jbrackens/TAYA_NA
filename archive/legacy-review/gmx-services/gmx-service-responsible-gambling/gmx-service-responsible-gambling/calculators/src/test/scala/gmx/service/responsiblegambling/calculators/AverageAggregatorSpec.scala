package gmx.service.responsiblegambling.calculators

import gmx.data.SportsBetPlaced
import gmx.dataapi.internal.customer.AverageSportsBetStakeChanged
import org.scalatest.{Inside, Inspectors, OptionValues}
import org.scalatest.matchers.should
import org.scalatest.wordspec.AnyWordSpec

class AverageAggregatorSpec
  extends AnyWordSpec
    with should.Matchers
    with OptionValues
    with Inside
    with Inspectors{

  "AverageAggregator" should {

    "sum two aggregations" in {
      val value = SportsBetPlaced("Alice", "foo", "foo", "foo", "foo", "foo", "100", 0, 0.0f)
      val accumulator = Accumulator(1, 10)

      val result = new AverageAggregator().add(value, accumulator)

      result should ===(Accumulator(2, 110))
    }

    "calculate correct average" in {
      val accumulator = Accumulator(5, 500)
      val aggregator = new AverageAggregator

      aggregator.getResult(accumulator) should ===(AverageSportsBetStakeChanged("100.0000", 0))
    }
  }
}
