package eeg.waysun.events.validators.streams.builders

import eeg.waysun.events.validators.Implicits
import eeg.waysun.events.validators.Types.Raw
import eeg.waysun.events.validators.data.RawDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util
import java.util.Collections

class RawEventsStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare raw events stream" in {
      val env = StreamExecutionEnvironment.getExecutionEnvironment
      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val numberOfGeneratedDefinitions = 10
      val messages = RawDataProvider.all(numberOfGeneratedDefinitions).map(item => new Tuple2(item._1, item._2))

      val stream = new RawEventsStreamBuilder().buildTopology {
        env.fromCollection(messages)(Implicits.RawImplicit.keyWithValue)
      }
      stream.addSink(new RawEventsStreamBuilderSpec.CustomSink())
      env.execute()

      RawEventsStreamBuilderSpec.result should have size messages.size
    }
  }
}

object RawEventsStreamBuilderSpec {
  class CustomSink extends SinkFunction[Raw.KeyedType] {
    override def invoke(value: Raw.KeyedType, context: SinkFunction.Context[_]): Unit = {
      RawEventsStreamBuilderSpec.result.add(value)
    }
  }

  val result = Collections.synchronizedList(new util.ArrayList[AnyRef])
}
