package eeg.waysun.events.aggregation.mappers

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import stella.dataapi.aggregation.AggregationResultKey

class AggregationKeyBySpec extends StreamingTestBase {

  val objectUnderTest = AggregationKeyBy

  "aggregationOccurrenceAsKey" should {
    "extract the AggregationResultKey from Types.AggregationOccurrence.OutputType" in {
      // given
      val input: Types.AggregationOccurrence.KeyedType =
        AggregationOccurrenceProvider.keyed(
          AggregationOccurrenceProvider.Parameters(
            userId = "test-user",
            projectId = "projectId",
            eventName = "value-compare",
            aggregationDefinitionRuleId = Some("aggregationDefinitionRuleId"),
            aggregationGroupByFieldValue = Some("aggregationGroupByFieldValue")))
      //when
      val result: AggregationResultKey = objectUnderTest.aggregationOccurrenceAsKey(input)
      //then
      result shouldBe new AggregationResultKey(
        "aggregationDefinitionRuleId",
        "projectId",
        "aggregationGroupByFieldValue")
    }
  }

}
