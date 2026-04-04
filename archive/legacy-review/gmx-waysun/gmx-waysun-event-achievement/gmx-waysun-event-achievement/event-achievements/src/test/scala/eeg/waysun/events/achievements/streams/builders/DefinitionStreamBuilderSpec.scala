package eeg.waysun.events.achievements.streams.builders

import eeg.waysun.events.achievements.Implicits
import eeg.waysun.events.achievements.Types.DefinitionType
import eeg.waysun.events.achievements.data.DefinitionDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.apache.flink.api.java.tuple.Tuple2
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.util
import java.util.Collections

class DefinitionStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare definition stream" in {

      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val numberOfGeneratedDefinitions = 10
      val messages = DefinitionDataProvider.all(numberOfGeneratedDefinitions).map(item => new Tuple2(item._1, item._2))

      val stream = DefinitionStreamBuilder().buildTopology {
        env.fromCollection(messages)(Implicits.DefinitionImplicit.keyWithValue)
      }
      stream.addSink(new DefinitionStreamBuilderSpec.CustomSink())
      env.execute()

      DefinitionStreamBuilderSpec.result.size must be(messages.size)
    }
  }
}

object DefinitionStreamBuilderSpec {
  class CustomSink extends SinkFunction[DefinitionType.Wrapped] {
    override def invoke(value: DefinitionType.Wrapped, context: SinkFunction.Context[_]): Unit = {
      DefinitionStreamBuilderSpec.result.add(value)
    }
  }

  val result = Collections.synchronizedList(new util.ArrayList[AnyRef])
}
