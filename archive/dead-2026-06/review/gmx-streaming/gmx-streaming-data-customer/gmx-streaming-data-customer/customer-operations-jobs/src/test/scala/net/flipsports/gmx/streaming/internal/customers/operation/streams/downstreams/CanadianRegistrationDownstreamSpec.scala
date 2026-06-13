package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import java.util
import java.util.Collections

import net.flipsports.gmx.streaming.common.job.SportNationMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.JoinedCustomerDetailWithLoginsImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class CanadianRegistrationDownstreamSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "process undecided items" in {
      val messages = CustomerWithLoginDataProvider.asScalaAllWithCurrentRegistration()

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      val metaParameters = new SportNationMetaParameters {}
      val sourceStream = env.fromCollection(messages)(JoinedCustomerDetailWithLoginsImplicit.keyWithValue)

      val sink = new DownstreamSinkFunction() {
        override def write(value: Tuple2[KeyType, ValueType]): Unit = CanadianRegistrationDownstreamSpec.result.add(value)
      }
      CanadianRegistrationDownstream(metaParameters)
        .processStream(sourceStream, env)(env.getConfig)
        .addSink(sink)

      env.execute()

      CanadianRegistrationDownstreamSpec.result.size() must be(1)
    }

  }
}

object CanadianRegistrationDownstreamSpec {
  val result = Collections.synchronizedList(new util.ArrayList[Tuple2[KeyType, ValueType]])
}