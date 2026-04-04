package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.JoiningType
import eeg.waysun.events.achievements.data.AchievementDefinitionBuilder
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementDefinitionAnyAggregationRuleIdCheckSpec extends StreamingTestBase {

  "Achievement definition has given aggregation" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
      initializeConfiguration()

    "accept" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event")

      val eventKey = new JoiningType.AggregationIdType(projectId, aggregationRuleBuilder.id())

      // when
      val result = new AchievementDefinitionAnyAggregationRuleIdCheck(eventKey, definition._2).check

      // then

      result mustBe true

    }

    "reject" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event")

      val eventKey = new JoiningType.AggregationIdType(projectId, aggregationRuleBuilder.next().id())

      // when
      val result = new AchievementDefinitionAnyAggregationRuleIdCheck(eventKey, definition._2).check

      // then

      result mustBe false
    }
  }

}
