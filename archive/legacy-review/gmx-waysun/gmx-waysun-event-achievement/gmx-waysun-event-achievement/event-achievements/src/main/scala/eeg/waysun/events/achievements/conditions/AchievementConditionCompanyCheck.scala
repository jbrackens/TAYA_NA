package eeg.waysun.events.achievements.conditions

import eeg.waysun.events.achievements.Types._
import org.apache.commons.lang3.StringUtils

case class AchievementConditionCompanyCheck(definition: DefinitionType.Source, event: AggregatedType.Source)
    extends Check {

  override def check: Boolean = {
    val aggregationProjectId = event.f0.getProjectId.toString
    val definitionProjectId = definition.f0.getProjectId.toString
    StringUtils.equalsIgnoreCase(aggregationProjectId, definitionProjectId)
  }
}
