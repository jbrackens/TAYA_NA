package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{CustomerLoginStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.IrishAccountRegistrationFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class IrishRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends  CustomerDetailToCustomerStateChangeDownstream[CustomerLoginStream] {
  override def processStream(dataStream: CustomerLoginStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .filter(IrishAccountRegistrationFilter())
      .flatMap(CustomerMapper.irish(businessMetaParameters.brand()))
  }
}

object IrishRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters) = new IrishRegistrationDownstream(businessMetaParameters)
}
