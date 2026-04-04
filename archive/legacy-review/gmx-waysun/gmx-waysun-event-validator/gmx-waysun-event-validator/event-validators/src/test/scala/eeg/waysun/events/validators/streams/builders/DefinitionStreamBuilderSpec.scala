package eeg.waysun.events.validators.streams.builders

import eeg.waysun.events.validators.Implicits
import eeg.waysun.events.validators.Types.Definition
import eeg.waysun.events.validators.data.DefinitionDataProvider
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util
import java.util.Collections

class DefinitionStreamBuilderSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "prepare definition stream" in {
      val env = StreamExecutionEnvironment.getExecutionEnvironment

      env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

      val numberOfGeneratedDefinitions = 10
      val messages = DefinitionDataProvider.all(numberOfGeneratedDefinitions).map(item => new Tuple2(item._1, item._2))

      val stream = new DefinitionStreamBuilder().buildTopology {
        env.fromCollection(messages)(Implicits.DefinitionImplicit.keyWithValue)
      }
      stream.addSink(new DefinitionStreamBuilderSpec.CustomSink())
      env.execute()

      DefinitionStreamBuilderSpec.result should have size messages.size
    }
  }
}

object DefinitionStreamBuilderSpec {
  class CustomSink extends SinkFunction[Definition.KeyedType] {
    override def invoke(value: Definition.KeyedType, context: SinkFunction.Context[_]): Unit = {
      DefinitionStreamBuilderSpec.result.add(value)
    }
  }

  val result = Collections.synchronizedList(new util.ArrayList[AnyRef])
}
