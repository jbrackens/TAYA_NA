package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.data.ValidatedEventProvider
import eeg.waysun.events.aggregation.streams.builders.ValidatedStreamBuilderSpec.MockSink
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.job.streams.dto.FTuple.FTuple2
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util
import java.util.Collections

class ValidatedStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare aggregation control stream and wrap it" in {
      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val source = ValidatedEventProvider
        .all(10)
        .map(item => new FTuple2[Types.Validated.KeyType, Types.Validated.ValueType](item._1, item._2))

      val dataStream = ValidatedStreamBuilder.buildTopology {
        env.fromCollection(source)(Implicits.ValidatedImplicit.source)
      }

      dataStream.addSink(new MockSink)
      env.execute()

      ValidatedStreamBuilderSpec.result should have size source.size

    }
  }

}

object ValidatedStreamBuilderSpec {

  val result = Collections.synchronizedList(new util.ArrayList[Types.Validated.KeyedType])

  class MockSink extends SinkFunction[Types.Validated.KeyedType] {
    override def invoke(value: Types.Validated.KeyedType, context: SinkFunction.Context[_]): Unit = {
      result.add(value)
    }
  }
}
