package net.flipsports.gmx.streaming.sbtech.streams.downstreams

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

trait Downstream[IN, OUT] extends Serializable with LazyLogging {

  def processStream(dataStream: IN, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): OUT

  def name(): String
}