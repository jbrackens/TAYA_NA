package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{CustomerLoginStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.CanadianRegistrationFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment


class CanadianRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[CustomerLoginStream] {

  override def processStream(dataStream: CustomerLoginStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .filter(CanadianRegistrationFilter())
      .name("canadian-registration-users")
      .flatMap(CustomerMapper.canadian(businessMetaParameters.brand()))
  }
}

object CanadianRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters) = new CanadianRegistrationDownstream(businessMetaParameters)
}
