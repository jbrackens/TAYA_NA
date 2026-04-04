package gmx.service.responsiblegambling.generators

import gmx.dataapi.internal.customer.DepositLimitSet

class AlertGeneratorStateSpec extends UnitSpec {

  "An AlertGeneratorState" when {
    val alice = DepositLimitSet("abc", 100, 101, "foo", "Alice", "DAY", "100.0000", "GBP")
    val bob   = DepositLimitSet("def", 1000, 1001, "bar", "Bob", "WEEK", "1000.0000", "GBP")
    val carol = DepositLimitSet("ghi", 2000, 2001, "foo", "Carol", "MONTH", "1500.0000", "USD")

    "empty" should {

      "have no head" in {
        val result = AlertGeneratorState[DepositLimitSet].head
        result should ===(None)
      }

      "return no entries after any timestamp" in {
        val state  = AlertGeneratorState[DepositLimitSet]
        val result = state.countEntriesAfter(0)
        result should ===(0)
      }

      "return a new state when an event is added that contains only the event added" in {
        val state     = AlertGeneratorState[DepositLimitSet]
        val nextState = state + alice

        nextState should !==(state)
        nextState.size should ===(1)
      }

      "return None as earliestTimestamp" in {
        val state = AlertGeneratorState[DepositLimitSet]

        state.earliestTimestamp should ===(None)
      }
    }

    "containing items" should {

      "return the item with the highest timestamp as head" in {
        val state = AlertGeneratorState[DepositLimitSet] + bob + alice

        state.head should !==(None)
        state.head.map(_.customerId).getOrElse("The Devil Himself!") should ===(bob.customerId)
      }

      "return only items after the provided timestamp" in {
        val state = AlertGeneratorState[DepositLimitSet] + bob + carol + alice

        state.onlyEntriesAfter(110) should ===(AlertGeneratorState[DepositLimitSet] + bob + carol)
      }

      "return the earliest timestamp" in {
        val state = AlertGeneratorState[DepositLimitSet] + bob + carol + alice

        state.earliestTimestamp.get should ===(100)
      }
    }
  }
}
