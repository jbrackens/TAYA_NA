package eeg.waysun.events.achievements.streams

import stella.dataapi.achievement.AchievementTriggerBehaviour
import eeg.waysun.events.achievements.Types.StreamType.{AchievementDefinitionStream, AggregateStream}
import eeg.waysun.events.achievements.data.DataHelpers._
import eeg.waysun.events.achievements.data.OperationHelper._
import eeg.waysun.events.achievements.data.{AchievementDefinitionBuilder, AggregatedTypeDataBuilder}
import eeg.waysun.events.achievements.streams.builders.{AggregateEventsStreamBuilder, DefinitionStreamBuilder}
import eeg.waysun.events.achievements.{Implicits, Types}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment
import org.scalatest.MustMatchers.convertToAnyMustWrapper

import java.util
import java.util.Collections

class EventAchievementStreamSpec extends StreamingTestBase with FlinkJobsTestRunner with StreamEnvironment {

  "Stream" should {

    val (projectId, aggregationRuleId, aggregationGroupByField, achievementRuleId) = initializeConfiguration()
    val eventConfigurationName = "sample-event"

    "produce always output on each aggregation event" in {
      // given
      withStreamingEnvironment { (config, env, businessParams, metaParameters) =>
        val stream = new EventAchievementStream(metaParameters, businessParams, config) {
          override def definitionStream(env: StreamExecutionEnvironment): AchievementDefinitionStream = {
            DefinitionStreamBuilder().buildTopology {
              val messages = Seq(
                AchievementDefinitionBuilder(projectId, achievementRuleId, aggregationRuleId, aggregationGroupByField)
                  .build(eventConfigurationName)
                  .asTuple)
              env.fromCollection(messages)(Implicits.DefinitionImplicit.keyWithValue)
            }
          }

          override def aggregationEventsStream(env: StreamExecutionEnvironment): AggregateStream = {
            val messages = buildToIndex(10) { _ =>
              AggregatedTypeDataBuilder(projectId, aggregationRuleId, aggregationGroupByField).next().asTuple
            }

            AggregateEventsStreamBuilder().buildTopology {
              env.fromCollection(messages)(Implicits.AggregatedImplicit.keyWithValue)
            }
          }
        }

        stream.buildTopology(env, businessParams.brand()).addSink(new EventAchievementStreamSpec.MultipleElementSink())

        env.execute()

        EventAchievementStreamSpec.resultMultiple.size mustBe 10
      }
    }

    "produce only once output on first aggregation event" in {
      // given
      withStreamingEnvironment { (config, env, businessParams, metaParameters) =>
        val stream = new EventAchievementStream(metaParameters, businessParams, config) {
          override def definitionStream(env: StreamExecutionEnvironment): AchievementDefinitionStream = {
            DefinitionStreamBuilder().buildTopology {
              val messages = Seq(
                AchievementDefinitionBuilder(projectId, achievementRuleId, aggregationRuleId, aggregationGroupByField)
                  .build(eventConfigurationName, policy = AchievementTriggerBehaviour.ONLY_ONCE)
                  .asTuple)
              env.fromCollection(messages)(Implicits.DefinitionImplicit.keyWithValue)
            }
          }

          override def aggregationEventsStream(env: StreamExecutionEnvironment): AggregateStream = {
            val messages = buildToIndex(10) { _ =>
              AggregatedTypeDataBuilder(projectId, aggregationRuleId, aggregationGroupByField).next().asTuple
            }

            AggregateEventsStreamBuilder().buildTopology {
              env.fromCollection(messages)(Implicits.AggregatedImplicit.keyWithValue)
            }
          }
        }

        stream.buildTopology(env, businessParams.brand()).addSink(new EventAchievementStreamSpec.SingleElementSink())

        env.execute()

        EventAchievementStreamSpec.resultSingle.size mustBe 1
      }
    }

    "produce no output on any aggregation event" in {
      // given
      withStreamingEnvironment { (config, env, businessParams, metaParameters) =>
        val stream = new EventAchievementStream(metaParameters, businessParams, config) {
          override def definitionStream(env: StreamExecutionEnvironment): AchievementDefinitionStream = {
            DefinitionStreamBuilder().buildTopology {
              val messages = Seq(
                AchievementDefinitionBuilder(projectId, achievementRuleId, aggregationRuleId, aggregationGroupByField)
                  .build(eventConfigurationName)
                  .asTuple)
              env.fromCollection(messages)(Implicits.DefinitionImplicit.keyWithValue)
            }
          }

          override def aggregationEventsStream(env: StreamExecutionEnvironment): AggregateStream = {
            val messages = buildToIndex(10) { _ =>
              AggregatedTypeDataBuilder(projectId, aggregationRuleId.next(), aggregationGroupByField.next())
                .next()
                .asTuple
            }

            AggregateEventsStreamBuilder().buildTopology {
              env.fromCollection(messages)(Implicits.AggregatedImplicit.keyWithValue)
            }
          }
        }

        stream.buildTopology(env, businessParams.brand()).addSink(new EventAchievementStreamSpec.NoOutputSink())

        env.execute()

        EventAchievementStreamSpec.resultNoOutput.size mustBe 0
      }
    }
  }
}

object EventAchievementStreamSpec {
  val resultSingle = Collections.synchronizedList(new util.ArrayList[AnyRef])
  val resultMultiple = Collections.synchronizedList(new util.ArrayList[AnyRef])
  val resultNoOutput = Collections.synchronizedList(new util.ArrayList[AnyRef])

  class SingleElementSink extends SinkFunction[Types.AchievedType.Source] {
    override def invoke(value: Types.AchievedType.Source, context: SinkFunction.Context[_]): Unit = {
      EventAchievementStreamSpec.resultSingle.add(value)
    }
  }

  class MultipleElementSink extends SinkFunction[Types.AchievedType.Source] {
    override def invoke(value: Types.AchievedType.Source, context: SinkFunction.Context[_]): Unit = {
      EventAchievementStreamSpec.resultMultiple.add(value)
    }
  }

  class NoOutputSink extends SinkFunction[Types.AchievedType.Source] {
    override def invoke(value: Types.AchievedType.Source, context: SinkFunction.Context[_]): Unit = {
      EventAchievementStreamSpec.resultNoOutput.add(value)
    }
  }
}
