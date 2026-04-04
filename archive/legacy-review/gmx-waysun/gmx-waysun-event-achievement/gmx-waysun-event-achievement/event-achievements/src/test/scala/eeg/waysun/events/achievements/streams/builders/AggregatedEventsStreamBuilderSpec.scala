package eeg.waysun.events.achievements.streams.builders

import eeg.waysun.events.achievements.Implicits
import eeg.waysun.events.achievements.Types.AggregatedType
import eeg.waysun.events.achievements.data.RawDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.util
import java.util.Collections

class AggregatedEventsStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare aggregated events stream" in {

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val numberOfGeneratedDefinitions = 10
      val messages = RawDataProvider.all(numberOfGeneratedDefinitions).map(item => new Tuple2(item._1, item._2))

      val stream = AggregateEventsStreamBuilder().buildTopology {
        env.fromCollection(messages)(Implicits.AggregatedImplicit.keyWithValue)
      }
      stream.addSink(new AggregatedEventsStreamBuilderSpec.CustomSink())
      env.execute()

      AggregatedEventsStreamBuilderSpec.result.size must be(messages.size)
    }
  }
}

object AggregatedEventsStreamBuilderSpec {
  class CustomSink extends SinkFunction[AggregatedType.Wrapped] {
    override def invoke(value: AggregatedType.Wrapped, context: SinkFunction.Context[_]): Unit = {
      AggregatedEventsStreamBuilderSpec.result.add(value)
    }
  }

  val result = Collections.synchronizedList(new util.ArrayList[AnyRef])
}
