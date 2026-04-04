package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.StateChangeStream
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

trait CustomerDetailToCustomerStateChangeDownstream[IN] extends Serializable {

  def processStream(dataStream: IN, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream

}
