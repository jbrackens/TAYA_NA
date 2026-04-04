package net.flipsports.gmx.streaming.sbtech.streams.builders

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.SourceTypes.{Selection, Streams}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.sbtech.processors.v1.NullDownstreamProcessor
import net.flipsports.gmx.streaming.sbtech.streams.watermarks.SelectionWatermarks
import net.flipsports.gmx.streaming.sbtech.{SourceImplicits, SourceTypes}
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util.UUID

class SelectionStreamBuilder(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig) extends Serializable {

  val sourceBrandName = businessMetaParameters.brand().sourceBrand.name

  val selectionsSourceTopic: String = TopicNames.Source.selections(configuration, businessMetaParameters)

  @transient
  val uuid = UUID.randomUUID().toString

  def build(env: StreamExecutionEnvironment, kafkaProperties: KafkaProperties): Streams.OddsStream = {
    buildTopology {
      val selectionsSourceKafkaProperties = kafkaProperties.withApplicationId(AppConfig.applicationId(s"markets-$uuid", businessMetaParameters))
      val source = KafkaSource(selectionsSourceTopic, selectionsSourceKafkaProperties, configuration.sourceTopics.schemaRegistry)
        .specificKeyValue[SourceTypes.Selection.KeyType, SourceTypes.Selection.ValueType](SourceTypes.Selection.KeyClass, SourceTypes.Selection.ValueClass)

      SourceDataStreamBuilder
        .withSource[Selection.Source](env, source, s"selections" )(SourceImplicits.Selection.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream:  => Streams.SelectionStream): Streams.OddsStream = {
    dataStream
      .assignTimestampsAndWatermarks(SelectionWatermarks())
      .name("gmx-streaming.selections-consumed")
      .uid("gmx-streaming.selections-consumed")
      .process(NullDownstreamProcessor.selections())(SourceImplicits.Odds.keyWithValue)
  }
}

object SelectionStreamBuilder {

  def apply(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig): SelectionStreamBuilder = new SelectionStreamBuilder(businessMetaParameters, configuration)
}