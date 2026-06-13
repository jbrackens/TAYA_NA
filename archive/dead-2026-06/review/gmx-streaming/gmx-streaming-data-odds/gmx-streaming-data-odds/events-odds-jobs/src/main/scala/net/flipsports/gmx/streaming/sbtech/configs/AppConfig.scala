package net.flipsports.gmx.streaming.sbtech.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.BusinessMetaParameters

case class AppConfig(kafka: KafkaProperties, sourceTopics: SourceTopic, targetTopics: TargetTopics, features: Features = Features())

case class SourceTopic(selections: String, markets: String, events: String, schemaRegistry: String)

case class TargetTopics(odds: String, schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      odds = config.getString("odds"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SbTechTopics {
  def apply(config: Config): SourceTopic = {
    SourceTopic(
      selections = config.getString("selections"),
      markets = config.getString("markets"),
      events = config.getString("events"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object AppConfig {
  val name = "sbTech"

  def apply(config: Config): AppConfig = {
    AppConfig(
      kafka = KafkaProperties.apply(config.getConfig("kafka")),
      sourceTopics = SbTechTopics.apply(config.getConfig("source-topics")),
      targetTopics = TargetTopics.apply(config.getConfig("target-topics"))
    )
  }

  def applicationId(subModule: String, businessMetaParameters: BusinessMetaParameters): String =
    s"gmx-streaming.odds-on-${businessMetaParameters.brand().sourceBrand.name}-$subModule"
}

object ConfigurationLoader extends LazyLogging {


  def apply : AppConfig = apply(AppConfig.name).get

  def apply(name: String): Option[AppConfig] = {
    val configs = ConfigFactory.load.getConfig(name)
    Some(AppConfig.apply(configs))
  }

}
