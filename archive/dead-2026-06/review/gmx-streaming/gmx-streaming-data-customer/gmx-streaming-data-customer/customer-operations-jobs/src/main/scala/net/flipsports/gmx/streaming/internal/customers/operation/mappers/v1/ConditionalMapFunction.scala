package net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1

import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

trait ConditionalMapFunction[SourceKey, SourceValue, TargetKey, TargetValue] extends MapFunction[Tuple2[SourceKey, SourceValue], Tuple2[TargetKey, TargetValue]]{

  def shouldExecute(record: Tuple2[SourceKey, SourceValue]): Boolean = true

}
