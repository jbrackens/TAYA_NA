package net.flipsports.gmx.streaming.internal.customers.operation.streams.builders

import java.util
import java.util.Collections

import SBTech.Microservices.DataStreaming.DTO.Login.v1.{Login, LoginCustomerId}
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.LoginsImplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins.ValueType
import net.flipsports.gmx.streaming.internal.customers.operation.Types.PreJoin
import net.flipsports.gmx.streaming.internal.customers.operation.Types.PreJoin.KeyType
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.LoginDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class LoginsStreamBuilderSpec extends StreamingTestBase
  with FlinkJobsTestRunner {

  "Application" should {

    "prepare customer stream with timestamp and watermark" in {

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val logins = Seq(
        build(1),
        build(2),
        build(3),
        build(4),
        build(5)
      )


      val stream = LoginsStreamBuilder().buildTopology {
        env.fromCollection(logins)(LoginsImplicit.keyWithValue)
      }
      stream.addSink(new LoginsPreJoinSink())
      env.execute()

      LoginsPreJoinSink.result.size must be (5)
      LoginsPreJoinSink.result.forEach { login =>
        login.f0 mustBe login.f1.getCustomerID
      }

    }

  }

  def build(id: Int): FlinkTuple[LoginCustomerId, Login] = {
    val event = LoginDataProvider().single
    event.f0.setCustomerID(id)
    event.f1.setCustomerID(id)
    event
  }


}

class LoginsPreJoinSink extends SinkFunction[FlinkTuple[PreJoin.KeyType, Types.Logins.ValueType]] {
  override def invoke(value: FlinkTuple[KeyType, ValueType], context: SinkFunction.Context[_]): Unit = {
    LoginsPreJoinSink.result.add(value)
  }
}

object LoginsPreJoinSink {

  val result = Collections.synchronizedList(new util.ArrayList[FlinkTuple[PreJoin.KeyType, Types.Logins.ValueType]])
}