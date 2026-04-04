package eeg.waysun.events.aggregation.streams.builders

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.configs.AppConfigDef.AppConfig
import eeg.waysun.events.aggregation.configs.TopicNames
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import org.apache.flink.streaming.api.functions.source.SourceFunction

class SourceBuilder(
    kafkaProperties: KafkaProperties,
    configuration: AppConfig,
    businessMetaParameters: BusinessMetaParameters) {

  val eventDefinitionTopic = TopicNames.Source.eventDefinition(configuration, businessMetaParameters)

  val eventValidatedTopic = TopicNames.Source.validatedEvents(configuration, businessMetaParameters)

  val aggregationDefinitionTopic = TopicNames.Source.aggregationDefinition(configuration, businessMetaParameters)

  val aggregationControlTopic = TopicNames.Source.aggregationControl(configuration, businessMetaParameters)

  def validatedEvents: SourceFunction[Types.Validated.Source] =
    KafkaSource(eventValidatedTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.Validated.KeyType, Types.Validated.ValueType](
        Types.Validated.keyClass,
        Types.Validated.valueClass)

  def aggregationDefinitions: SourceFunction[Types.AggregationDefinition.Source] =
    KafkaSource(aggregationDefinitionTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue[Types.AggregationDefinition.KeyType, Types.AggregationDefinition.ValueType](
        Types.AggregationDefinition.keyClass,
        Types.AggregationDefinition.valueClass)
      .setStartFromEarliest()

  def aggregationControls: SourceFunction[Types.AggregationControl.Source] =
    KafkaSource(aggregationControlTopic, kafkaProperties, configuration.targetTopics.schemaRegistry)
      .jsonKeyValue[Types.AggregationControl.KeyType, Types.AggregationControl.ValueType](
        Types.AggregationControl.keyClass,
        Types.AggregationControl.valueClass)
}

object SourceBuilder {
  def apply(
      kafkaProperties: KafkaProperties,
      configuration: AppConfig,
      businessMetaParameters: BusinessMetaParameters): SourceBuilder =
    new SourceBuilder(kafkaProperties, configuration, businessMetaParameters)

}
