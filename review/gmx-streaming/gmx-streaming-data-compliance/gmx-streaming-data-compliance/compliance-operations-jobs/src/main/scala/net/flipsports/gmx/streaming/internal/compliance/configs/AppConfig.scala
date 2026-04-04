package net.flipsports.gmx.streaming.internal.compliance.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class AppConfig(
    kafka: KafkaProperties,
    sourceTopics: SourceTopics,
    targetTopics: TargetTopics
)

case class SourceTopics(
    walletTransactions: String,
    schemaRegistry: String
)

case class TargetTopics(complianceValidation: String, schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      complianceValidation = config.getString("compliance-validation"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SourceTopics {
  def apply(config: Config): SourceTopics = {
    SourceTopics(
      walletTransactions = config.getString("wallet-transactions"),
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