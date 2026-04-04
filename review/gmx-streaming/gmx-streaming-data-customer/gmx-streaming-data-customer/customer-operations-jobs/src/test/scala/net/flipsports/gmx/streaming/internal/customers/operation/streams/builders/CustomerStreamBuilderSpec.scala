package net.flipsports.gmx.streaming.internal.customers.operation.streams.builders

import java.time.Instant
import java.util
import java.util.Collections

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.CustomerDetailsImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.Types.PreJoin
import net.flipsports.gmx.streaming.internal.customers.operation.Types.PreJoin.KeyType
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class CustomerStreamBuilderSpec extends StreamingTestBase
  with FlinkJobsTestRunner {

  "Application" should {

    "prepare customer stream with timestamp and watermark" in {

      val env = StreamExecutionEnvironment
        .getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val customerDetails = Seq(
        build(1, Instant.now()),
        build(2, Instant.now()),
        build(3, Instant.now()),
        build(4, Instant.now()),
        build(5, Instant.now())
      )


      val stream = CustomerStreamBuilder().buildTopology {
        env.fromCollection(customerDetails)(CustomerDetailsImplicit.keyWithValue)
      }
      stream.addSink(new CustomerPreJoinSink())
      env.execute()

      CustomerPreJoinSink.result.size must be (5)

    }

  }

  def build(id: Int, registrationDateTime: Instant): FlinkTuple[CustomerDetailCustomerId, CustomerDetail] = {
    val customerDetail = CustomerDetailsDataProvider().single
    customerDetail.f0.setCustomerID(id)
    customerDetail.f1.setCustomerID(id)
    customerDetail.f1.setRegistrationDate(registrationDateTime.toEpochMilli)
    customerDetail
  }


}

class CustomerPreJoinSink extends SinkFunction[FlinkTuple[PreJoin.KeyType, Types.CustomerDetail.ValueType]] {
  override def invoke(value: FlinkTuple[KeyType, ValueType], context: SinkFunction.Context[_]): Unit = {
    CustomerPreJoinSink.result.add(value)
  }
}

object CustomerPreJoinSink {

  val result = Collections.synchronizedList(new util.ArrayList[AnyRef])
}