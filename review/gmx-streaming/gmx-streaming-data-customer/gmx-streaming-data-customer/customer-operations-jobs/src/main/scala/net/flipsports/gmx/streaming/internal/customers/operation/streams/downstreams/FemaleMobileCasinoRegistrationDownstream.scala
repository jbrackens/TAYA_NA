package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams.{PreJoinCustomerStream, StateChangeStream}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.FemaleMobileCasinoRegistrationFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerMapper
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class FemaleMobileCasinoRegistrationDownstream(businessMetaParameters: BusinessMetaParameters) extends CustomerDetailToCustomerStateChangeDownstream[PreJoinCustomerStream] {

  override def processStream(dataStream: PreJoinCustomerStream, env: StreamExecutionEnvironment)(implicit ec: ExecutionConfig): StateChangeStream = {
    dataStream
      .filter(FemaleMobileCasinoRegistrationFilter())
      .flatMap(CustomerMapper.female(businessMetaParameters.brand()))
  }

}

object FemaleMobileCasinoRegistrationDownstream {

  def apply(businessMetaParameters: BusinessMetaParameters): FemaleMobileCasinoRegistrationDownstream = new FemaleMobileCasinoRegistrationDownstream(businessMetaParameters)
}