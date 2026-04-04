package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.EventOccurrence.KeyedType
import eeg.waysun.events.aggregation.data.StreamsProvider
import eeg.waysun.events.aggregation.data.generators.instances.instances.dataset._
import eeg.waysun.events.aggregation.streams.dto.Field
import eeg.waysun.events.aggregation.streams.joining.EventWithDefinitionToEventOccurrence
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.util
import java.util.Collections
import scala.collection.convert.ImplicitConversions.`collection AsScalaIterable`

class EventWithDefinitionOccurrenceJoinerSpec extends StreamingTestBase with FlinkJobsTestRunner {

  "Application" should {

    "produce output on each aggregation event" in {
      // given

      val objectUnderTest = EventWithDefinitionToEventOccurrence

      implicit val env: StreamExecutionEnvironment = {
        val e = StreamExecutionEnvironment.getExecutionEnvironment
        e.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
        e
      }
      val stream = objectUnderTest.build {
        StreamsProvider().build
      }
      stream.addSink(new EventWithDefinitionOccurrenceJoinerSpec.ElementSink)

      // when
      env.execute()
      // then
      EventWithDefinitionOccurrenceJoinerSpec.resultSingle.forEach(println)
      EventWithDefinitionOccurrenceJoinerSpec.resultSingle.size mustBe 2

      val result: KeyedType = EventWithDefinitionOccurrenceJoinerSpec.resultSingle.toSeq.head

      result.key.projectId shouldBe companyId.value
      result.key.eventDefinitionId shouldBe eventDefinitionRuleId.value
      result.key.eventName shouldBe eventName.value

      result.value.fields(0) shouldBe Field("country", "string", countryExample)
      result.value.fields(1) shouldBe Field("user", "string", userExample)
      result.value.fields(2) shouldBe Field("extra", "string", "extra")

    }
  }

}

object EventWithDefinitionOccurrenceJoinerSpec {
  val resultSingle: util.List[KeyedType] =
    Collections.synchronizedList(new util.ArrayList[Types.EventOccurrence.KeyedType])
  class ElementSink extends SinkFunction[Types.EventOccurrence.KeyedType] {
    override def invoke(value: Types.EventOccurrence.KeyedType, context: SinkFunction.Context[_]): Unit = {
      EventWithDefinitionOccurrenceJoinerSpec.resultSingle.add(value)
    }
  }

}
