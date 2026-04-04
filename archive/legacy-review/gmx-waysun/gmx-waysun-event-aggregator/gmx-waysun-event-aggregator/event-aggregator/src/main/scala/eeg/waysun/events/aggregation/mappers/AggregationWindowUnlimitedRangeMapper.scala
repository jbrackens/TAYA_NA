package eeg.waysun.events.aggregation.mappers

import eeg.waysun.events.aggregation.Types.AggregationResult.KeyedType
import org.apache.flink.api.common.functions.MapFunction

class AggregationWindowUnlimitedRangeMapper extends MapFunction[KeyedType, KeyedType] {

  override def map(source: KeyedType): KeyedType = {
    val value = source.value
    if (value.getWindowRangeStartUTC == Long.MinValue) {
      value.setWindowRangeStartUTC(null)
    }
    if (value.getWindowRangeEndUTC == Long.MaxValue) {
      value.setWindowRangeEndUTC(null)
    }
    source
  }

}

object AggregationWindowUnlimitedRangeMapper {

  def apply(): MapFunction[KeyedType, KeyedType] =
    new AggregationWindowUnlimitedRangeMapper()
}
