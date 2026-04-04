package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementConditionsCheckWithEmptyConditionsSpec extends StreamingTestBase {

  "Achievement empty condition" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
      initializeConfiguration()

    val fakeEvent = AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
    val event = fakeEvent.asSource

    "match event if conditions are empty" in {
      // given
      val condition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event", Some(Seq())).asSource

      // when
      val result = AchievementConditionCompanyCheck(condition, event).check

      // then
      result mustBe true
    }

    "reject event if conditions are not empty" in {
      // given
      val condition = AchievementDefinitionBuilder(
        s"$projectId-1",
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event").asSource

      // when
      val result = AchievementConditionCompanyCheck(condition, event).check

      // then
      result mustBe false
    }
  }
}
