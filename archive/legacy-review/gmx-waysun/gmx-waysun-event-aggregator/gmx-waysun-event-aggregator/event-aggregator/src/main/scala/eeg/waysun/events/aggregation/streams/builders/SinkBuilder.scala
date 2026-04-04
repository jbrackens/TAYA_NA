package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import eeg.waysun.events.aggregation.configs.TopicNames
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import org.apache.flink.streaming.api.functions.sink.SinkFunction

case class SinkBuilder(
    kafkaProperties: KafkaProperties,
    configuration: AppConfig,
    businessMetaParameters: BusinessMetaParameters) {
  val aggregationResultTopic = TopicNames.Target.aggregationResult(configuration, businessMetaParameters)

  def aggregationResults: SinkFunction[Types.AggregationResult.SinkType] =
    KafkaSink(aggregationResultTopic, kafkaProperties, configuration.targetTopics.schemaRegistry)
      .keyAndValue[Types.AggregationResult.KeyType, Types.AggregationResult.ValueType](
        Types.AggregationResult.keyClass,
        Types.AggregationResult.valueClass)
}

object SinkBuilder {

  def apply(
      kafkaProperties: KafkaProperties,
      configuration: AppConfig,
      businessMetaParameters: BusinessMetaParameters): SinkBuilder =
    new SinkBuilder(kafkaProperties, configuration, businessMetaParameters)

}
