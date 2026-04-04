package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementConditionCompanyCheckSpec extends StreamingTestBase {

  "Achievement company condition" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
      initializeConfiguration()

    val fakeEvent = AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
    val event = fakeEvent.asSource

    "match event if event company matches" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event").asSource

      // when
      val result = AchievementConditionCompanyCheck(definition, event).check

      // then
      result mustBe true
    }

    "reject event if event company not equals" in {
      // given
      val definition = AchievementDefinitionBuilder(
        s"$projectId-1",
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event").asSource

      // when
      val result = AchievementConditionCompanyCheck(definition, event).check

      // then
      result mustBe false
    }
  }
}
