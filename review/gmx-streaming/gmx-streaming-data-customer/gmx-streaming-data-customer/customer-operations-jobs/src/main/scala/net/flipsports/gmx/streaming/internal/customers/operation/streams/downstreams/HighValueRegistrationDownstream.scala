package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{CustomerLoginStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.HighValueRegistrationFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class HighValueRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[CustomerLoginStream] with LazyLogging {

  override def processStream(dataStream: CustomerLoginStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .filter(HighValueRegistrationFilter())
      .flatMap(CustomerMapper.highValue(businessMetaParameters.brand()))
  }

}

object HighValueRegistrationDownstream {


  def apply(businessMetaParameters: BusinessMetaParameters): HighValueRegistrationDownstream = new HighValueRegistrationDownstream(businessMetaParameters)
}

