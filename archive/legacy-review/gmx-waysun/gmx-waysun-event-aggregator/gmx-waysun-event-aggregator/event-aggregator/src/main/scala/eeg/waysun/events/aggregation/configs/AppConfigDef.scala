package eeg.waysun.events.aggregation.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import stella.dataapi.aggregation.IntervalType
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

object AppConfigDef {
  val name = "app"

  case class AppConfig(
      kafka: KafkaProperties,
      sourceTopics: SourceTopics,
      targetTopics: TargetTopics,
      cleaningPolicy: Seq[CleaningPolicies] = Seq()) {

    def getPolicyOrDefault(intervalType: IntervalType): CleaningPolicies =
      cleaningPolicy.find(_.interval == intervalType.name()).getOrElse(CleaningPolicies(intervalType.name(), 10))

  }

  case class CleaningPolicies(interval: String, cyclesToKeep: Long)
  case class SourceTopics(
      eventDefinition: String,
      validatedEvents: String,
      aggregationDefinition: String,
      aggregationControl: String,
      schemaRegistry: String)

  case class TargetTopics(aggregationResult: String, schemaRegistry: String)

  object TargetTopics {
    def apply(config: Config): TargetTopics = {
      TargetTopics(
        aggregationResult = config.getString("aggregation-result"),
        schemaRegistry = config.getString("schema-registry"))
    }
  }

  object SourceTopics {
    def apply(config: Config): SourceTopics = {
      SourceTopics(
        eventDefinition = config.getString("event-definition"),
        validatedEvents = config.getString("event-validated"),
        aggregationDefinition = config.getString("aggregation-definition"),
        aggregationControl = config.getString("aggregation-control"),
        schemaRegistry = config.getString("schema-registry"))
    }
  }

  object ConfigurationLoader extends LazyLogging {

    def apply: AppConfig = apply(AppConfigDef.name).get

    def apply(config: Config): AppConfig = {
      AppConfig(
        kafka = KafkaProperties.apply(config.getConfig("kafka")),
        sourceTopics = SourceTopics.apply(config.getConfig("source-topics")),
        targetTopics = TargetTopics.apply(config.getConfig("target-topics")))
    }

    def apply(name: String): Option[AppConfig] = {
      val configs = ConfigFactory.load.getConfig(name)
      Some(apply(configs))
    }

  }

}
