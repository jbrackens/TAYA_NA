package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.Types
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue

object AchievementDefinitionMapper {

  def toWrapped: Types.DefinitionType.Source => Types.DefinitionType.Wrapped = item => KeyValue.fromTuple2(item)
}
