package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.data.AggregationDefinitionConfigurationProvider
import eeg.waysun.events.aggregation.streams.builders.AggregationDefinitionStreamBuilderSpec.MockSink
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util
import java.util.Collections

class AggregationDefinitionStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare aggregation control stream and wrap it" in {
      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val source = AggregationDefinitionConfigurationProvider().all(10).map(item => new Tuple2(item._1, item._2))

      val dataStream = AggregationDefinitionStreamBuilder.buildTopology {
        env.fromCollection(source)(Implicits.AggregationDefinitionImplicit.source)
      }

      dataStream.addSink(new MockSink)

      env.execute()

      AggregationDefinitionStreamBuilderSpec.result should have size source.size

    }
  }

}

object AggregationDefinitionStreamBuilderSpec {

  val result = Collections.synchronizedList(new util.ArrayList[Types.AggregationDefinition.KeyedType])

  class MockSink extends SinkFunction[Types.AggregationDefinition.KeyedType] {
    override def invoke(value: Types.AggregationDefinition.KeyedType, context: SinkFunction.Context[_]): Unit = {
      result.add(value)
    }
  }
}
