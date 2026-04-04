package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types.{DefinitionType, JoiningType}
import org.apache.commons.lang3.StringUtils

case class AchievementDefinitionCompanyCheck(
    currentKey: JoiningType.AggregationIdType,
    cacheKey: DefinitionType.KeyType)
    extends Check {

  def check: Boolean = {
    val keyProjectId = currentKey.projectId
    val projectId = cacheKey.getProjectId.toString
    StringUtils.equals(projectId, keyProjectId)
  }
}
