package net.flipsports.gmx.streaming.common.functions

import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

trait KeyedDownstream[K, V, OK, OV] extends Serializable {

  def processStream(dataStream: DataStream[Tuple2[K, V]], env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig) : DataStream[Tuple2[OK, OV]]

}