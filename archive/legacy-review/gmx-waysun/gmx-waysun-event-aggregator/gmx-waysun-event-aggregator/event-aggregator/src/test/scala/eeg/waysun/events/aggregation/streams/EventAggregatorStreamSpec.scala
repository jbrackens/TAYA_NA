package eeg.waysun.events.aggregation.streams

import eeg.waysun.events.aggregation.Types.Stream.{
  AggregationControlKeyedDataStream,
  AggregationDefinitionKeyedDataStream,
  AggregationInProjectsKeyedDataStream,
  ValidatedEventsKeyedDataStream
}
import eeg.waysun.events.aggregation.data.generators.instances._
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import eeg.waysun.events.aggregation.streams.builders.{
  AggregationControlStreamBuilder,
  AggregationDefinitionStreamBuilder,
  ValidatedStreamBuilder
}
import eeg.waysun.events.aggregation.{Implicits, Types}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalactic.source.Position
import org.scalatest.MustMatchers.convertToAnyMustWrapper
import org.scalatest.time.{Seconds, Span}

import java.util
import java.util.Collections

class EventAggregatorStreamSpec extends StreamingTestBase with FlinkJobsTestRunner with StreamEnvironment {

  "Application" ignore {

    "produce output on each aggregation event" in {
      // given
      withStreamingEnvironment { (config, env, businessParams, metaParameters) =>
        val stream: EventAggregatorStream = new EventAggregatorStream(Array(), metaParameters, businessParams, config) {
          import dataset._

          override def validatedStream(env: StreamExecutionEnvironment): ValidatedEventsKeyedDataStream = {
            ValidatedStreamBuilder.buildTopology {
              val messages =
                new Validated(userId, eventDefinitionRuleId, eventName, companyId, messageId, scenario).all(1)
              env.fromCollection(messages)(Implicits.ValidatedImplicit.source)
            }
          }

          override def aggregationDefinitionStream(
              env: StreamExecutionEnvironment): AggregationDefinitionKeyedDataStream = {
            AggregationDefinitionStreamBuilder.buildTopology {
              val messages =
                new AggregationDefinition(eventName, eventDefinitionRuleId, companyId, aggregationRuleId, scenario)
                  .all(1)
              env.fromCollection(messages)(Implicits.AggregationDefinitionImplicit.source)
            }
          }

          override def aggregationControlStream(env: StreamExecutionEnvironment): AggregationControlKeyedDataStream = {
            AggregationControlStreamBuilder.buildTopology {
              val messages = new AggregationControl(companyId, aggregationRuleId).all(1)
              env.fromCollection(messages)(Implicits.AggregationControlImplicit.source)
            }
          }

          override def aggregationsInProjectStream(aggregationDefinitionStream: AggregationDefinitionKeyedDataStream)
              : AggregationInProjectsKeyedDataStream = {
            val messages =
              new AggregationDefinition(eventName, eventDefinitionRuleId, companyId, aggregationRuleId, scenario)
                .all(1)
                .map { item =>
                  new Types.AggregationsInProjects.KeyedType(item.f0.projectId.toString, item.f0.getRuleId.toString)
                }
            env.fromCollection(messages)(Implicits.AggregationsInProjectImplicit.keyed)
          }
        }
        stream.buildTopology(env).addSink(new EventAggregatorStreamSpec.ElementSink)
        // when
        env.execute()
        // then

        eventually {

          EventAggregatorStreamSpec.resultSingle.size mustBe 2
        }(
          config = PatienceConfig(timeout = scaled(Span(10, Seconds)), interval = scaled(Span(5, Seconds))),
          pos = Position.here)
      }
    }

  }
}

object EventAggregatorStreamSpec {
  val resultSingle = Collections.synchronizedList(new util.ArrayList[AnyRef])
  class ElementSink extends SinkFunction[Types.AggregationResult.SinkType] {
    override def invoke(value: Types.AggregationResult.SinkType, context: SinkFunction.Context[_]): Unit = {
      EventAggregatorStreamSpec.resultSingle.add(value)
    }
  }

}
