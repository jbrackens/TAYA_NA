package net.flipsports.gmx.streaming.internal.customers.operation.streams.builders

import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.{CustomerDetailsImplicit, PreJoinImplicit}
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, CustomerStateChange, Streams}
import net.flipsports.gmx.streaming.internal.customers.operation.filters.v1.CustomerStateChangeFilter
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.CustomerIdRecordMapper
import net.flipsports.gmx.streaming.internal.customers.operation.processors.v1.KeyedMainDownstreamProcessor
import net.flipsports.gmx.streaming.internal.customers.operation.watermarks.CustomerDetailMessageCreationDateAssigner
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class CustomerStreamBuilder extends Serializable {

  def build(env: StreamExecutionEnvironment, source: SourceFunction[Types.CustomerDetail.Source]): Streams.PreJoinCustomerStream = {
    buildTopology {
      SourceDataStreamBuilder
        .withSource[CustomerDetail.Source](env, source,"customer-details" )(CustomerDetailsImplicit.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream:  => Types.Streams.CustomerStream): Streams.PreJoinCustomerStream = {
    dataStream.assignTimestampsAndWatermarks(CustomerDetailMessageCreationDateAssigner())
      .filter(filtersDefinition.input)
      .name("filtered-registration")
      .map(CustomerIdRecordMapper())(PreJoinImplicit.CustomerDetails.keyWithValue)
      .keyBy(_.f0)(PreJoinImplicit.key)
      .process(new KeyedMainDownstreamProcessor())(PreJoinImplicit.CustomerDetails.keyWithValue)
  }

  def filtersDefinition: InputOutputFilter[CustomerDetail.Source, CustomerStateChange.Source] = CustomerStateChangeFilter()
}

object CustomerStreamBuilder {

  def apply(): CustomerStreamBuilder = new CustomerStreamBuilder()

}