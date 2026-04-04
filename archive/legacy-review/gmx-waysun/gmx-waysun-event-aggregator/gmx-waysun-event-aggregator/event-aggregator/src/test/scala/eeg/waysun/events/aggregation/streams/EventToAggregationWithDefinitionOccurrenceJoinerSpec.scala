package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.data.generators.instances.instances.dataset._
import eeg.waysun.events.aggregation.data.{DataStreamProvider, StreamsProvider}
import eeg.waysun.events.aggregation.streams.dto.Field
import eeg.waysun.events.aggregation.streams.joining.EventOccurrenceToAggregationCandidate
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.util
import java.util.Collections
import scala.collection.convert.ImplicitConversions.`collection AsScalaIterable`

class EventToAggregationWithDefinitionOccurrenceJoinerSpec
    extends StreamingTestBase
    with FlinkJobsTestRunner
    with StreamEnvironment {
  //TODO: pbyczuk fix in next iteration
  "Application" ignore {

    "produce output on each aggregation event" in {
      // given

      val expectedEventResult =
        new eeg.waysun.events.aggregation.data.generators.instances.EventOcurrence(
          eeg.waysun.events.aggregation.data.generators.instances.EventOcurrence.ExpectedEventOcurrence(Seq(
            Field(name = "user", fieldType = "string", value = userExample),
            Field(name = "country", fieldType = "string", value = countryExample),
            Field(name = "extra", fieldType = "string", value = "extra")))).single(1)

      val objectUnderTest = EventOccurrenceToAggregationCandidate

      withStreamingEnvironment { (_, env, _, _) =>
        val streams = StreamsProvider().build(env)
        val eventOccurrenceStream =
          DataStreamProvider.WithTypeInformation(Seq(expectedEventResult), Implicits.EventOccurrenceImplicit.keyed)(env)

        val stream =
          objectUnderTest.build(streams, eventOccurrenceStream)(JobExecutionParameters(Array()))

        stream.addSink(new EventToAggregationWithDefinitionOccurrenceJoinerSpec.ElementSink)

        // when
        env.execute()
        // then
        EventToAggregationWithDefinitionOccurrenceJoinerSpec.resultSingle.forEach(println)
        EventToAggregationWithDefinitionOccurrenceJoinerSpec.resultSingle.size mustBe 1

        val result: Types.AggregationCandidate.KeyedType =
          EventToAggregationWithDefinitionOccurrenceJoinerSpec.resultSingle.toSeq.head

        result.key.projectId shouldBe companyId.value
        result.key.eventDefinitionId shouldBe eventDefinitionRuleId.value
      }

    }
  }

}

object EventToAggregationWithDefinitionOccurrenceJoinerSpec {
  val resultSingle: util.List[Types.AggregationCandidate.KeyedType] =
    Collections.synchronizedList(new util.ArrayList[Types.AggregationCandidate.KeyedType])
  class ElementSink extends SinkFunction[Types.AggregationCandidate.KeyedType] {
    override def invoke(value: Types.AggregationCandidate.KeyedType, context: SinkFunction.Context[_]): Unit = {
      EventToAggregationWithDefinitionOccurrenceJoinerSpec.resultSingle.add(value)
    }
  }

}
