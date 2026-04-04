package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types
import eeg.waysun.events.achievements.Types.Ids.{AggregationRuleId, ProjectId}
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue.fromTuple
import net.flipsports.gmx.streaming.common.job.streams.dto.{KeyValue, State}
import org.apache.flink.api.java.tuple

object DataHelpers {

  implicit class AggregatedTypeValue(val value: Types.AggregatedType.ValueType) {
    def asSource(
        aggregationRuleId: AggregationRuleId,
        projectId: ProjectId,
        groupByField: String): Types.AggregatedType.Source = {
      val key = new Types.AggregatedType.KeyType(aggregationRuleId, projectId, groupByField)
      new Types.AggregatedType.Source(key, value)
    }
  }

  implicit class AggregatedTypeTuple(val event: (Types.AggregatedType.KeyType, Types.AggregatedType.ValueType)) {
    def asSource: Types.AggregatedType.Source = new Types.AggregatedType.Source(event._1, event._2)
  }

  implicit class AchievementDefinitionTuple(val event: (Types.DefinitionType.KeyType, Types.DefinitionType.ValueType)) {
    def asSource: Types.DefinitionType.Source = new Types.DefinitionType.Source(event._1, event._2)
  }

  implicit class ToFlinkTupleFromSeq[K, V](val events: Seq[(K, V)]) {
    def asTuple: Seq[tuple.Tuple2[K, V]] = events.map(item => new tuple.Tuple2(item._1, item._2))
  }

  implicit class ToFlinkTuple[K, V](val event: (K, V)) {
    def asTuple: tuple.Tuple2[K, V] = new tuple.Tuple2(event._1, event._2)
  }

  implicit class AsKeyedValue[K, V](val event: (K, V)) {
    def wrapped: KeyValue[K, V] = fromTuple(event)
  }

  implicit class AsActiveState[K, V](val event: (K, V)) {
    def active: State[K, V] = new State[K, V](event._1, event._2)
  }
}
