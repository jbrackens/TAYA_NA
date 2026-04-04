package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.data.AggregatedTypeDataBuilder
import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AggregationKeyBySpec extends StreamingTestBase {

  "Mapper" should {

    "map" in {
      // given
      val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, _) = initializeConfiguration()
      val aggregatedType =
        AggregatedTypeDataBuilder(projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder).next()
      val event = aggregatedType.wrapped

      // when
      val result = AggregationKeyBy.aggregationIdInCompany(event)

      // then
      result.projectId mustBe projectId
      result.aggregationRuleId mustBe aggregationRuleBuilder.id()
    }
  }
}
