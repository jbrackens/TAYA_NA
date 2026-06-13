package net.flipsports.gmx.streaming.internal.customers.operation.streams.downstreams

import java.util
import java.util.Collections

import net.flipsports.gmx.streaming.common.job.{FansbetUkMetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.JoinedCustomerDetailWithLoginsImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerStateChange.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.CustomerWithLoginDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class NewSegmentAccountRegistrationDownstreamSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {
    val messages = CustomerWithLoginDataProvider.asScalaAllWithCurrentRegistration()
    val env = StreamExecutionEnvironment.getExecutionEnvironment
    val sourceStream = env.fromCollection(messages)(JoinedCustomerDetailWithLoginsImplicit.keyWithValue)
    val sink = new DownstreamSinkFunction() {
      override def write(value: tuple.Tuple2[KeyType, ValueType]): Unit =
        NewSegmentAccountRegistrationDownstreamSpec.result.add(value)
    }

    "process items for SportNation" in {
      //given
      val metaParameters = new SportNationMetaParameters {}

      NewSegmentAccountRegistrationDownstream(metaParameters)
        .processStream(sourceStream, env)(env.getConfig)
        .addSink(sink)

      env.execute()

      //when
      val result = NewSegmentAccountRegistrationDownstreamSpec.result.size()

      //then
      result must be(1)
    }

    "process items for FansBetUk" in {
      //given
      val metaParameters = new FansbetUkMetaParameters {}

      NewSegmentAccountRegistrationDownstream(metaParameters)
        .processStream(sourceStream, env)(env.getConfig)
        .addSink(sink)

      env.execute()

      //when
      val result = NewSegmentAccountRegistrationDownstreamSpec.result.size()

      //then
      result must be(2)
    }

  }
}
object NewSegmentAccountRegistrationDownstreamSpec {

  val result =
    Collections.synchronizedList(new util.ArrayList[Tuple2[KeyType, ValueType]])
}
