package net.flipsports.gmx.streaming.internal.notifications.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class AppConfig(
    kafka: KafkaProperties,
    sourceTopics: SourceTopics,
    targetTopics: TargetTopics
)

case class SourceTopics(
    customerDetails: String,
    schemaRegistry: String
)

case class TargetTopics(notifications: String, schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      notifications = config.getString("notifications"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SourceTopics {
  def apply(config: Config): SourceTopics = {
    SourceTopics(
      customerDetails = config.getString("customer-details"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}


object AppConfig {
  val name = "app"

  def apply(config: Config): AppConfig = {
    AppConfig(
      kafka = KafkaProperties.apply(config.getConfig("kafka")),
      sourceTopics = SourceTopics.apply(config.getConfig("source-topics")),
      targetTopics = TargetTopics.apply(config.getConfig("target-topics"))
    )
  }
}

object ConfigurationLoader extends LazyLogging {


  def apply : AppConfig = apply(AppConfig.name).get

  def apply(name: String): Option[AppConfig] = {
    val configs = ConfigFactory.load.getConfig(name)
    Some(AppConfig.apply(configs))
  }

}