package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types
import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data.{AggregatedTypeDataBuilder, ConditionTypeDataProvider}
import eeg.waysun.events.achievements.operations.AggregationFunctions
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementConditionValueMatchCheckSpec extends StreamingTestBase {

  "Achievement condition value match" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, _) =
      initializeConfiguration()

    "accept max function" in {
      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("1.0", field = Some(AggregationFunctions.max)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("0.0", field = Some(AggregationFunctions.max)),
        false)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .neq("1.0", field = Some(AggregationFunctions.max)),
        false)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("1.0", field = Some(AggregationFunctions.max)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .le("1.0", field = Some(AggregationFunctions.max)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .lt("1.0", field = Some(AggregationFunctions.max)),
        false)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .lt("2.0", field = Some(AggregationFunctions.max)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .gt("0.0", field = Some(AggregationFunctions.max)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .ge("1.0", field = Some(AggregationFunctions.max)),
        true)

    }

    "accept min function" in {
      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("0.0", field = Some(AggregationFunctions.min)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("1.0", field = Some(AggregationFunctions.min)),
        false)
    }

    "accept count function" in {
      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("2", field = Some(AggregationFunctions.count)),
        true)

      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("3", field = Some(AggregationFunctions.count)),
        false)
    }

    "accept sum function" in {
      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("3.0", field = Some(AggregationFunctions.sum)),
        true)
      assertValueMatch(
        ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder)
          .eq("4.0", field = Some(AggregationFunctions.sum)),
        false)
    }

    def assertValueMatch(condition: Types.DefinitionType.ConditionType, expectedResult: Boolean) = {
      // given
      val fakeEvent =
        AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
      val event = fakeEvent.wrapped
      // when
      val result = AchievementConditionValueMatchCheck(condition, event).check
      // then
      result mustBe expectedResult
    }
  }

}
