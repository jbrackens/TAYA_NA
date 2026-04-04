package net.flipsports.gmx.streaming.sbtech.streams.builders

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.SourceTypes.{Market, Streams}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.sbtech.processors.v1.NullDownstreamProcessor
import net.flipsports.gmx.streaming.sbtech.streams.watermarks.MarketsWatermarks
import net.flipsports.gmx.streaming.sbtech.{SourceImplicits, SourceTypes}
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util.UUID

class MarketStreamBuilder(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig) extends Serializable with LazyLogging {

  val sourceBrandName = businessMetaParameters.brand().sourceBrand.name

  val marketsSourceTopic: String = TopicNames.Source.markets(configuration, businessMetaParameters)

  @transient
  val uuid = UUID.randomUUID().toString

  def build(env: StreamExecutionEnvironment, kafkaProperties: KafkaProperties): Streams.OddsStream = {
    buildTopology {
      val marketsSourceKafkaProperties = kafkaProperties.withApplicationId(AppConfig.applicationId(s"markets-$uuid", businessMetaParameters))
      val source = KafkaSource(marketsSourceTopic, marketsSourceKafkaProperties, configuration.sourceTopics.schemaRegistry)
        .specificKeyValue[SourceTypes.Market.KeyType, SourceTypes.Market.ValueType](SourceTypes.Market.KeyClass, SourceTypes.Market.ValueClass)

      SourceDataStreamBuilder
        .withSource[Market.Source](env, source, s"markets" )(SourceImplicits.Market.keyWithValue)
    }
  }

  @VisibleForTesting
  def buildTopology(dataStream:  => Streams.MarketStream): Streams.OddsStream = {
    dataStream
      .assignTimestampsAndWatermarks(MarketsWatermarks())
      .name("gmx-streaming.markets-consumed")
      .uid("gmx-streaming.markets-consumed")
      .process(NullDownstreamProcessor.markets())(SourceImplicits.Odds.keyWithValue)
  }
}

object MarketStreamBuilder {

  def apply(businessMetaParameters: BusinessMetaParameters, configuration: AppConfig): MarketStreamBuilder = new MarketStreamBuilder(businessMetaParameters, configuration)

}