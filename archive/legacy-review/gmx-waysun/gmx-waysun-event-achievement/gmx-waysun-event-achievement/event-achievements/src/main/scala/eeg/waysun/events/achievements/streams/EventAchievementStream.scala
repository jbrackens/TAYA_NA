package eeg.waysun.events.achievements.streams

import eeg.waysun.events.achievements.Types
import eeg.waysun.events.achievements.Types.StreamType.{AchievementDefinitionStream, AggregateStream}
import eeg.waysun.events.achievements.configs.AppConfigDef.AppConfig
import eeg.waysun.events.achievements.configs.TopicNames
import eeg.waysun.events.achievements.streams.builders.{AggregateEventsStreamBuilder, DefinitionStreamBuilder}
import eeg.waysun.events.achievements.streams.dto.Streams
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class EventAchievementStream(
    metaParameters: MetaParameters,
    businessMetaParameters: BusinessMetaParameters,
    configuration: AppConfig)
    extends CustomStream(metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(
    s"eeg-streaming.events-validation-on-${businessMetaParameters.brand().sourceBrand.name}")

  val achievementDefinitionTopic = TopicNames.Source.eventDefinition(configuration, businessMetaParameters)

  val aggregateTopic = TopicNames.Source.aggregates(configuration, businessMetaParameters)

  val achievementTopic = TopicNames.Target.achievements(configuration, businessMetaParameters)

  lazy val achievementDefinitionEvents: SourceFunction[Types.DefinitionType.Source] =
    KafkaSource(achievementDefinitionTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.DefinitionType.KeyType, Types.DefinitionType.ValueType](
        Types.DefinitionType.keyClass,
        Types.DefinitionType.valueClass)

  lazy val aggregateEvents: SourceFunction[Types.AggregatedType.Source] =
    KafkaSource(aggregateTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.AggregatedType.KeyType, Types.AggregatedType.ValueType](
        Types.AggregatedType.keyClass,
        Types.AggregatedType.valueClass)

  lazy val achievementResult: SinkFunction[Types.AchievedType.Source] =
    KafkaSink(achievementTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .keyAndValue[Types.AchievedType.KeyType, Types.AchievedType.ValueType](
        Types.AchievedType.keyClass,
        Types.AchievedType.valueClass)

  def join(streams: Streams): DataStream[Types.AchievedType.Source] = MultiStreamJoiner().join(streams)

  def aggregationEventsStream(env: StreamExecutionEnvironment): AggregateStream =
    AggregateEventsStreamBuilder().build(env, aggregateEvents)

  def definitionStream(env: StreamExecutionEnvironment): AchievementDefinitionStream =
    DefinitionStreamBuilder().build(env, achievementDefinitionEvents)

  def buildTopology(env: StreamExecutionEnvironment, brand: Brand): DataStream[Types.AchievedType.Source] = {
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    val streams = Streams(aggregationEvent = aggregationEventsStream(env), definition = definitionStream(env))
    join(streams)
  }

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit
      ec: ExecutionConfig): Unit = {
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    buildTopology(env, brand).addSink(achievementResult)
  }

}

object EventAchievementStream {

  def apply(
      metaParameters: MetaParameters,
      businessMetaParameters: BusinessMetaParameters,
      configuration: AppConfig): Unit =
    new EventAchievementStream(metaParameters, businessMetaParameters, configuration).stream()
}
