package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{CustomerLoginStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.FemaleBlockExtensionRegistrationFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class FemaleBlockExtensionRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[CustomerLoginStream] with LazyLogging {

  override def processStream(dataStream: CustomerLoginStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .filter(FemaleBlockExtensionRegistrationFilter())
      .flatMap(CustomerMapper.femaleBlockExtension(businessMetaParameters.brand()))
  }

}


object FemaleBlockExtensionRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): FemaleBlockExtensionRegistrationDownstream = new FemaleBlockExtensionRegistrationDownstream(businessMetaParameters)
}