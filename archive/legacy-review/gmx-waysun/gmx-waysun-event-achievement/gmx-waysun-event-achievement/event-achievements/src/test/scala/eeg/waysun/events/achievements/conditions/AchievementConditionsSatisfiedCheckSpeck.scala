package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.AchievementStateType
import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementConditionsSatisfiedCheckSpeck extends StreamingTestBase {

  "Achievement state" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
      initializeConfiguration()
    val fakeEvent = AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
    val event = fakeEvent.wrapped

    "accept if aggregation rule ids match " in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event")

      val achievementState: AchievementStateType.ValueType = new AchievementStateType.ValueType(
        aggregates = Map(aggregationRuleBuilder.id() -> event),
        definitionKey = definition._1,
        definition = definition._2)

      // when
      val result = AchievementConditionsSatisfiedCheck(achievementState).check

      // then
      result mustBe true
    }

    "reject if aggregation rule ids not match " in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event")

      val achievementState: AchievementStateType.ValueType = new AchievementStateType.ValueType(
        aggregates = Map(aggregationRuleBuilder.next().id() -> event),
        definitionKey = definition._1,
        definition = definition._2)

      // when
      val result = AchievementConditionsSatisfiedCheck(achievementState).check

      // then
      result mustBe false
    }
  }
}
