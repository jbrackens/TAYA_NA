package net.flipsports.gmx.streaming.internal.customers.operation.processors.v1

import net.flipsports.gmx.streaming.internal.customers.operation.Types
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.KeyedProcessFunction
import org.apache.flink.streaming.api.scala.OutputTag
import org.apache.flink.util.Collector

class KeyedMainDownstreamProcessor extends KeyedProcessFunction[Types.PreJoin.KeyType, Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType], Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]] {

  def forwardRecordToStream(output: OutputTag[Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]], ctx: KeyedProcessFunction[Types.PreJoin.KeyType, Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType], Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]]#Context, record: Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]) =
    ctx.output(output, record)

  def processElement(value: Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType], ctx: KeyedProcessFunction[Types.PreJoin.KeyType, Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType], Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]]#Context, out: Collector[Tuple2[Types.PreJoin.KeyType, Types.CustomerDetail.ValueType]]): Unit = {
    out.collect(value)
  }
}
