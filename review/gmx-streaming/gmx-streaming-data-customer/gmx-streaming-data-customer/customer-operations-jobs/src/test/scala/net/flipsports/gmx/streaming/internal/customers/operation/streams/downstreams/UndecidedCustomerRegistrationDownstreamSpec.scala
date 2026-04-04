package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import java.util
import java.util.Collections

import net.flipsports.gmx.streaming.common.job.SportNationMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.PreJoinImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class UndecidedCustomerRegistrationDownstreamSpec extends StreamingTestBase with FlinkJobsTestRunner {


  "Application" should {

    "process undecided items" in {
      val undecidedJson = "customerdetails-redzone.json"
      val messages = CustomerDetailsDataProvider.asScalaAllWithCurrentRegistration(Some(undecidedJson)).map(i => new Tuple2(i._1.getCustomerID, i._2))

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      val sink = new DownstreamSinkFunction() {
        override def write(value: Tuple2[KeyType, ValueType]): Unit = UndecidedCustomerRegistrationDownstreamSpec.result.add(value)
      }
      val metaParameters = new SportNationMetaParameters {}
      val sourceStream = env.fromCollection(messages)(PreJoinImplicit.CustomerDetails.keyWithValue)
      UndecidedCustomerRegistrationDownstream(metaParameters)
        .processStream(sourceStream, env)(env.getConfig)
        .addSink(sink)

      env.execute()

      UndecidedCustomerRegistrationDownstreamSpec.result.size() must be(4)
    }

  }
}

object UndecidedCustomerRegistrationDownstreamSpec {
  val result = Collections.synchronizedList(new util.ArrayList[Tuple2[KeyType, ValueType]])
}