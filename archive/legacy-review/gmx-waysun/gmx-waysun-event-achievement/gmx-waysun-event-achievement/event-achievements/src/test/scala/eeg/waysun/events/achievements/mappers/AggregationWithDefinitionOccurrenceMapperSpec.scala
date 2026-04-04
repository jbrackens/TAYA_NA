package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AggregationWithDefinitionOccurrenceMapperSpec extends StreamingTestBase {

  "Mapper" should {

    "map" in {
      // given
      val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
        initializeConfiguration()

      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event").active

      val fakeEvent =
        AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
      val event = fakeEvent.wrapped

      // when
      val result = AggregationWithDefinitionOccurrenceMapper.toAggregationWithDefinition(definition, event)

      // then
      result.get.achievementDefinition mustBe definition
      result.get.aggregation mustBe event
    }
  }
}
