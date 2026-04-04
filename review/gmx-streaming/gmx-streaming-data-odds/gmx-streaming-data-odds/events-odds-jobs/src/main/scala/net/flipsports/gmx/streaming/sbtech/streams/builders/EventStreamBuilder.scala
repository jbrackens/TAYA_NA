package net.flipsports.gmx.streaming.sbtech.streams.builders

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.SourceTypes.{Event, Streams}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.sbtech.processors.v1.NullDownstreamProcessor
import net.flipsports.gmx.streaming.sbtech.streams.watermarks.EventsWatermarks
import net.flipsports.gmx.streaming.sbtech.{SourceImplicits, SourceTypes}
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util.UUID

class EventStreamBuilder(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig) extends Serializable {

  val eventsSourceTopic: String = TopicNames.Source.events(configuration, businessMetaParameters)

  val sourceBrandName = businessMetaParameters.brand.sourceBrand.name

  @transient
  val uuid = UUID.randomUUID().toString

  def build(env: StreamExecutionEnvironment, kafkaProperties: KafkaProperties): Streams.OddsStream = buildTopology {
      val eventSourceKafkaProperties = kafkaProperties.withApplicationId(AppConfig.applicationId(s"events-$uuid", businessMetaParameters))
      val source = KafkaSource(eventsSourceTopic, eventSourceKafkaProperties, configuration.sourceTopics.schemaRegistry)
        .specificKeyValue[SourceTypes.Event.KeyType, SourceTypes.Event.ValueType](SourceTypes.Event.KeyClass, SourceTypes.Event.ValueClass)

      SourceDataStreamBuilder
        .withSource[Event.Source](env, source, s"events" )(SourceImplicits.Event.keyWithValue)
    }

  @VisibleForTesting
  def buildTopology(dataStream:  => Streams.EventStream): Streams.OddsStream = {
    dataStream
      .assignTimestampsAndWatermarks(EventsWatermarks())
      .name("gmx-streaming.events-consumed")
      .uid("gmx-streaming.events-consumed")
      .process(NullDownstreamProcessor.events())(SourceImplicits.Odds.keyWithValue)
  }
}

object EventStreamBuilder {

  def apply(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig): EventStreamBuilder = new EventStreamBuilder(businessMetaParameters, configuration)

}