package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{PreJoinCustomerStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class DummyPreJoinCustomerRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[PreJoinCustomerStream] {

  override def processStream(dataStream: PreJoinCustomerStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .flatMap(CustomerMapper.dummyPreJoinedCustomer(businessMetaParameters.brand()))
  }

}

object DummyPreJoinCustomerRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): DummyPreJoinCustomerRegistrationDownstream = new DummyPreJoinCustomerRegistrationDownstream(businessMetaParameters)
}