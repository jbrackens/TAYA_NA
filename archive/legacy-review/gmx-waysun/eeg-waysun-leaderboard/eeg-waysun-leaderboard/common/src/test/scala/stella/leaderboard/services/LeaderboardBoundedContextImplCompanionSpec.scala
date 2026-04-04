package stella.leaderboard.services

import java.util.UUID

import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.models.Ids.ProjectId

import stella.leaderboard.gen.Generators.aggregationResultFromEventGen

class LeaderboardBoundedContextImplCompanionSpec
    extends AnyFlatSpec
    with should.Matchers
    with ScalaCheckDrivenPropertyChecks {

  "getRidOfOutdatedAggregationResults" should "properly remove older entries" in {
    forAll(
      aggregationResultFromEventGen,
      aggregationResultFromEventGen,
      aggregationResultFromEventGen,
      aggregationResultFromEventGen,
      aggregationResultFromEventGen) { (ag1, ag2, ag3, ag4, ag5) =>
      val finalAggregationResult1 =
        if (ag1.projectId == ag2.projectId) ag1.copy(projectId = ProjectId.random()) else ag1
      val finalAggregationResult3 = ag3.copy(
        projectId = ag2.projectId,
        aggregationRuleId = ag2.aggregationRuleId,
        groupByFieldValue = ag2.groupByFieldValue,
        windowRangeStart = ag2.windowRangeStart,
        windowRangeEnd = ag2.windowRangeEnd)
      val finalAggregationResult4 = ag4.copy(
        projectId = ag2.projectId,
        aggregationRuleId = ag2.aggregationRuleId,
        groupByFieldValue =
          if (ag4.groupByFieldValue == ag2.groupByFieldValue) UUID.randomUUID().toString else ag4.groupByFieldValue,
        windowRangeStart = ag2.windowRangeStart,
        windowRangeEnd = ag2.windowRangeEnd)
      val finalAggregationResult5 = ag5.copy(
        projectId = ag2.projectId,
        aggregationRuleId = ag2.aggregationRuleId,
        groupByFieldValue = ag2.groupByFieldValue,
        windowRangeStart = ag2.windowRangeStart,
        windowRangeEnd = ag2.windowRangeEnd)
      val allResults =
        Seq(finalAggregationResult1, ag2, finalAggregationResult3, finalAggregationResult4, finalAggregationResult5)
      val expectedResults = Seq(ag1, finalAggregationResult4, finalAggregationResult5)
      val latestResults = LeaderboardBoundedContextImpl.getRidOfOutdatedAggregationResults(allResults)
      latestResults shouldBe expectedResults
    }
  }
}
