package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange.{KeyType, ValueType}
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.sink.SinkFunction


abstract class DownstreamSinkFunction extends SinkFunction[Tuple2[KeyType, ValueType]] with LazyLogging {
  override def invoke(value: Tuple2[KeyType, ValueType], context: SinkFunction.Context[_]): Unit = {
    write(value)
  }

  def write(value: Tuple2[KeyType, ValueType])

}
