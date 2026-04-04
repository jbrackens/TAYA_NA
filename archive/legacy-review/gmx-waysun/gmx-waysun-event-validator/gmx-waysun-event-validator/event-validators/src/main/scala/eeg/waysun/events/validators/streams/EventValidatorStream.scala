package eeg.waysun.events.validators.streams

import eeg.waysun.events.validators.Types.Stream.{DefinitionDataStream, RawDataStream}
import eeg.waysun.events.validators.Types.Validated.Source
import eeg.waysun.events.validators.configs.AppConfigDef.AppConfig
import eeg.waysun.events.validators.configs.TopicNames
import eeg.waysun.events.validators.streams.builders.{
  DefinitionStreamBuilder,
  RawEventsStreamBuilder,
  ValidationFailedStreamBuilder
}
import eeg.waysun.events.validators.streams.dto.Streams
import eeg.waysun.events.validators.{Names, Types}
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

class EventValidatorStream(
    args: Array[String],
    metaParameters: MetaParameters,
    businessMetaParameters: BusinessMetaParameters,
    configuration: AppConfig)
    extends CustomStream(args, metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties =
    configuration.kafka.withGroupId(Names.kafkaConsumerGroup(businessMetaParameters))

  val definitionTopic = TopicNames.Source.eventDefinition(configuration, businessMetaParameters)

  val rawTopic = TopicNames.Source.events(configuration, businessMetaParameters)

  val validated = TopicNames.Target.validatedEvents(configuration, businessMetaParameters)

  val failed = TopicNames.Target.failedEvents(configuration, businessMetaParameters)

  lazy val definitionEvents: SourceFunction[Types.Definition.Source] =
    KafkaSource(definitionTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.Definition.SourceKeyType, Types.Definition.ValueType](
        Types.Definition.sourceKeyClass,
        Types.Definition.valueClass)
      .setStartFromEarliest()

  lazy val rawEvents: SourceFunction[Types.Raw.Source] =
    KafkaSource(rawTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.Raw.SourceKeyType, Types.Raw.ValueType](Types.Raw.sourceKeyClass, Types.Raw.valueClass)
      .setStartFromEarliest()

  lazy val validatedResult: SinkFunction[Types.Validated.Source] =
    KafkaSink(validated, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .keyAndValue[Types.Validated.KeyType, Types.Validated.ValueType](
        Types.Validated.keyClass,
        Types.Validated.valueClass)

  lazy val failedResult: SinkFunction[Types.Failed.Source] =
    KafkaSink(failed, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .keyAndValue[Types.Failed.KeyType, Types.Failed.ValueType](Types.Failed.keyClass, Types.Failed.valueClass)

  def join(streams: Streams): DataStream[Source] = new MultiStreamJoiner().join(streams)

  def rawEventsStream(env: StreamExecutionEnvironment): RawDataStream =
    new RawEventsStreamBuilder().build(env, rawEvents)

  def failedStream(stream: DataStream[Source]): DataStream[Types.Failed.Source] =
    ValidationFailedStreamBuilder().build(stream)

  def definitionStream(env: StreamExecutionEnvironment): DefinitionDataStream =
    new DefinitionStreamBuilder().build(env, definitionEvents)

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit
      ec: ExecutionConfig): Unit = {
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    val streams: Streams = Streams(raw = rawEventsStream(env), definition = definitionStream(env))

    val joined = join(streams)
    joined.addSink(validatedResult).name(Names.validMessagesSink)

    failedStream(joined).addSink(failedResult).name(Names.failedMessagesSink)
  }

}

object EventValidatorStream {

  def apply(
      args: Array[String],
      metaParameters: MetaParameters,
      businessMetaParameters: BusinessMetaParameters,
      configuration: AppConfig): Unit =
    new EventValidatorStream(args, metaParameters, businessMetaParameters, configuration).stream()
}
