package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.data.generators.instances._
import eeg.waysun.events.aggregation.data.generators.instances.instances.Scenario.FieldName
import eeg.waysun.events.aggregation.data.generators.instances.instances.dataset._
import eeg.waysun.events.aggregation.data.{DataStreamProvider, StreamsProvider}
import eeg.waysun.events.aggregation.streams.dto.Field
import eeg.waysun.events.aggregation.streams.joining.AggregationWithControlJoiner
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.common.configs.JobExecutionParameters
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.scalatest.MustMatchers.convertToAnyMustWrapper
import stella.dataapi.aggregation.AggregationValues

import java.util
import java.util.Collections
import scala.collection.convert.ImplicitConversions.`collection AsScalaIterable`

class AggregationWithControlJoinerSpec extends StreamingTestBase with FlinkJobsTestRunner with StreamEnvironment {

  "Application" should {

    "produce output on each aggregation event" in {
      // given
      val expectedAgregationOcurrence = new AggregationOccurrence(
        AggregationOccurrence.ExpectedAggregationOccurrence(
          Field(name = "user", fieldType = "string", value = userExample),
          AggregationValues.newBuilder().setSum(0).setMin(0).setMax(0).setCount(1).setCustom("").build())).single(1)
      val objectUnderTest = AggregationWithControlJoiner

      withStreamingEnvironment { (config, env, _, _) =>
        val controlStream = DataStreamProvider.WithTypeInformation(
          Seq(expectedAgregationOcurrence),
          Implicits.AggregationOccurrenceImplicit.keyed)(env)
        val stream = objectUnderTest.aggregationControl(StreamsProvider().build(env), controlStream, config)(
          JobExecutionParameters(Array()))
        stream.addSink(new AggregationWithControlJoinerSpec.ElementSink)

        // when
        env.execute()
        // then
        AggregationWithControlJoinerSpec.resultSingle.forEach(println)
        AggregationWithControlJoinerSpec.resultSingle.size mustBe 1

        val result: Types.AggregationResult.KeyedType =
          AggregationWithControlJoinerSpec.resultSingle.toSeq.head

        result.key.projectId.toString shouldBe companyId.value
        result.key.aggregationRuleId.toString shouldBe aggregationRuleId.value
        result.key.groupByFieldValue.toString shouldBe countPersonsByCountry
          .fields(FieldName(countPersonsByCountry.aggregationFieldName))
          ._2
          .value

        result.value.aggregations.min shouldBe 0
        result.value.aggregations.max shouldBe 0
        result.value.aggregations.sum shouldBe 0
        result.value.aggregations.count shouldBe 1
        result.value.aggregations.custom shouldBe ""

      }

    }
  }

}

object AggregationWithControlJoinerSpec {
  val resultSingle: util.List[Types.AggregationResult.KeyedType] =
    Collections.synchronizedList(new util.ArrayList[Types.AggregationResult.KeyedType])
  class ElementSink extends SinkFunction[Types.AggregationResult.KeyedType] {
    override def invoke(value: Types.AggregationResult.KeyedType, context: SinkFunction.Context[_]): Unit = {
      AggregationWithControlJoinerSpec.resultSingle.add(value)
    }
  }

}
