package net.flipsports.gmx.streaming.idefix.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class IdefixConfig(kafka: KafkaProperties, sourceTopics: IdefixTopics, targetTopics: TargetTopics) {
  def getRegistry: String = sourceTopics.schemaRegistry
}

case class IdefixTopics(events: String, schemaRegistry: String)

case class TargetTopics(events: String, schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      events = config.getString("events"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object IdefixTopics {
  def apply(config: Config): IdefixTopics = {
    IdefixTopics(
      events = config.getString("events"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}



object IdefixConfig {
  val name = "idefix"

  def apply(config: Config): IdefixConfig = {
    IdefixConfig(
      kafka = KafkaProperties.apply(config.getConfig("kafka")),
      sourceTopics = IdefixTopics.apply(config.getConfig("source-topics")),

      targetTopics = TargetTopics.apply(config.getConfig("target-topics")),
    )
  }
}

object ConfigurationLoader extends LazyLogging {


  def apply : IdefixConfig = apply(IdefixConfig.name).get

  def apply(name: String): Option[IdefixConfig] = {
    val configs = ConfigFactory.load.getConfig(name)
    Some(IdefixConfig.apply(configs))
  }

}