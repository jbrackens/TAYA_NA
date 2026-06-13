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

class FemaleBlockRegistrationDownstreamSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    val appropriateAffiliateTag = "a_31"

    "process undecided items" in {
      // given
      val messages = CustomerDetailsDataProvider.asScalaAllWithCurrentRegistration(Some("customerdetails-fansbetuk.json"))
        .map(i => new Tuple2(i._1.getCustomerID, i._2))

      val testFemaleCustomer = messages.filter(_.f1.getCustomerID == 28933628).head
      testFemaleCustomer.f1.setAffiliateTag(appropriateAffiliateTag)

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      val metaParameters = new SportNationMetaParameters {}
      val sourceStream = env.fromCollection(messages)(PreJoinImplicit.CustomerDetails.keyWithValue)

      val sink = new DownstreamSinkFunction() {
        override def write(value: Tuple2[KeyType, ValueType]): Unit = FemaleBlockRegistrationDownstreamSpec.result.add(value)
      }
      FemaleBlockRegistrationDownstream(metaParameters)
        .processStream(sourceStream, env)(env.getConfig)
        .addSink(sink)

      env.execute()

      // when
      val result = FemaleBlockRegistrationDownstreamSpec.result.size()

      // then
      result must be(2)
    }

  }
}


object FemaleBlockRegistrationDownstreamSpec {
  val result = Collections.synchronizedList(new util.ArrayList[Tuple2[KeyType, ValueType]])
}


