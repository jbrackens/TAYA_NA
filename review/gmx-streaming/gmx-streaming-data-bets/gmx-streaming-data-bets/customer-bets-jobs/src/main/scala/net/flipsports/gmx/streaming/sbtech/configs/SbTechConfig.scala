package net.flipsports.gmx.streaming.sbtech.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class SbTechConfig(kafka: KafkaProperties, sourceTopics: SbTechTopics, targetTopics: TargetTopics) {
  def getRegistry = Some(sourceTopics.schemaRegistry)
}

case class SbTechTopics(casinoBets: String, customerDetails: String, sportBetsInfo: String, walletTransaction: String, customerDeposit: String, schemaRegistry: String)

case class TargetTopics(rewardsPoint: String, customerUpsert: String, betsFiltered: String, schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      rewardsPoint = config.getString("rewards-point-topic"),
      customerUpsert = config.getString("customer-upsert-topic"),
      betsFiltered = config.getString("bets-filtered"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SbTechTopics {
  def apply(config: Config): SbTechTopics = {
    SbTechTopics(
      casinoBets = config.getString("casino-bets"),
      customerDetails = config.getString("customer-details"),
      sportBetsInfo = config.getString("sport-bets-info"),
      walletTransaction = config.getString("wallet-transaction"),
      customerDeposit = config.getString("customer-deposit"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}



object SbTechConfig {
  val name = "sbTech"

  def apply(config: Config): SbTechConfig = {
    SbTechConfig(
      kafka = KafkaProperties.apply(config.getConfig("kafka")),
      sourceTopics = SbTechTopics.apply(config.getConfig("source-topics")),

      targetTopics = TargetTopics.apply(config.getConfig("target-topics")),
    )
  }
}

object ConfigurationLoader extends LazyLogging {


  def apply : SbTechConfig = apply(SbTechConfig.name).get

  def apply(name: String): Option[SbTechConfig] = {
    val configs = ConfigFactory.load.getConfig(name)
    Some(SbTechConfig.apply(configs))
  }

}