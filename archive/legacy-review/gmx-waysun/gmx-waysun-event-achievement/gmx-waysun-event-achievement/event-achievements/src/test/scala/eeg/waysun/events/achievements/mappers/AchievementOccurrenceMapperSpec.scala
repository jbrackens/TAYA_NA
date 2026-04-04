package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementOccurrenceMapperSpec extends StreamingTestBase {

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
      val fakeEvent =
        AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
      val event = fakeEvent.wrapped

      // when
      val result = AchievementOccurrenceMapper(event, definition.f0, definition.f1).toAchievement

      // then
      result.f0.getProjectId mustBe projectId
      result.f0.getAchievementRuleId mustBe achievementRuleIdBuilder.id()

      result.f1.getGroupByFieldValue mustBe event.key.getGroupByFieldValue
      result.f1.getWindowRangeEndUTC mustBe event.value.get.getWindowRangeEndUTC
      result.f1.getWindowRangeStartUTC mustBe event.value.get.getWindowRangeStartUTC
    }
  }
}
