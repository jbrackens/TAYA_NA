package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data.{AggregatedTypeDataBuilder, ConditionTypeDataProvider}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementConditionAggregationRuleCheckSpec extends StreamingTestBase {

  "Achievement conditions" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, _) =
      initializeConfiguration()

    val fakeEvent = AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
    val event = fakeEvent.wrapped

    "match event if event aggregationRuleId matches" in {
      // given
      val condition = ConditionTypeDataProvider(aggregationRuleBuilder, aggregationGroupByFieldBuilder).eq("1", None)

      // when
      val result = AchievementConditionAggregationRuleCheck(condition, event).check

      // then
      result mustBe true
    }

    "reject event if event aggregationRuleId not equals" in {
      // given
      val condition =
        ConditionTypeDataProvider(aggregationRuleBuilder.next(), aggregationGroupByFieldBuilder).eq("1", None)

      // when
      val result = AchievementConditionAggregationRuleCheck(condition, event).check

      // then
      result mustBe false
    }
  }

}
