package eeg.waysun.events.achievements.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

object AppConfigDef {
  val name = "app"

  case class AppConfig(kafka: KafkaProperties, sourceTopics: SourceTopics, targetTopics: TargetTopics)

  case class SourceTopics(definition: String, aggregated: String, schemaRegistry: String)

  case class TargetTopics(achievements: String, schemaRegistry: String)

  object TargetTopics {
    def apply(config: Config): TargetTopics = {
      TargetTopics(achievements = config.getString("achievement"), schemaRegistry = config.getString("schema-registry"))
    }
  }

  object SourceTopics {
    def apply(config: Config): SourceTopics = {
      SourceTopics(
        definition = config.getString("definition"),
        aggregated = config.getString("aggregated"),
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
