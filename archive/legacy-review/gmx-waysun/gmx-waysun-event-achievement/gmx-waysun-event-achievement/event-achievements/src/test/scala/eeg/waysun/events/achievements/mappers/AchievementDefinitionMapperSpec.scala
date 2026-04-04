package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.data.AchievementDefinitionBuilder
import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementDefinitionMapperSpec extends StreamingTestBase {

  "Mapper" should {

    "map" in {
      // given
      val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
        initializeConfiguration()

      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event").asSource

      // when
      val result = AchievementDefinitionMapper.toWrapped(definition)

      // then
      result.key mustBe definition.f0
      result.value mustBe Some(definition.f1)
    }
  }
}
