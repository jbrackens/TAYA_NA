package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{PreJoinLoginStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class DummyPreJoinLoginsRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[PreJoinLoginStream] {

  override def processStream(dataStream: PreJoinLoginStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .flatMap(CustomerMapper.dummyPreJoinedLogin(businessMetaParameters.brand()))
  }

}


object DummyPreJoinLoginsRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): DummyPreJoinLoginsRegistrationDownstream = new DummyPreJoinLoginsRegistrationDownstream(businessMetaParameters)

}
