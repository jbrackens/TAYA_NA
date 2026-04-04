package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types.Ids.ProjectId

object OperationHelper {

  def buildToIndex[R](index: Int)(f: Int => R): Seq[R] = (1 to index).map(f(_))

  def initializeConfiguration(projectId: ProjectId = "waysun")
      : (ProjectId, AggregationRuleIdBuilder, AggregationGroupByFieldBuilder, AchievementRuleIdBuilder) = {
    (projectId, AggregationRuleIdBuilder(), AggregationGroupByFieldBuilder(), AchievementRuleIdBuilder())
  }
}
