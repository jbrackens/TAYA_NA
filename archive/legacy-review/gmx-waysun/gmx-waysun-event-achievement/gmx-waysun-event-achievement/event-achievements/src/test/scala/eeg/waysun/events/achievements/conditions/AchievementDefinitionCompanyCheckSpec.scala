package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.JoiningType
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementDefinitionCompanyCheckSpec extends StreamingTestBase {

  "Achievement definition company" should {
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
      val result = AchievementDefinitionCompanyCheck(eventKey, definition._1).check

      // then
      result mustBe true
    }

    "reject" in {
      // given
      val definition = AchievementDefinitionBuilder(
        s"$projectId-1",
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event")

      val eventKey = new JoiningType.AggregationIdType(projectId, aggregationRuleBuilder.id())

      // when
      val result = AchievementDefinitionCompanyCheck(eventKey, definition._1).check

      // then
      result mustBe false
    }
  }
}
