package eeg.waysun.events.achievements.mappers

import eeg.waysun.events.achievements.Types
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue

object AggregationMapper {

  def toWrapped: Types.AggregatedType.Source => Types.AggregatedType.Wrapped = item => KeyValue.fromTuple2(item)
}
