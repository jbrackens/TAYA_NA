package net.flipsports.gmx.streaming.sbtech.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class SbTechConfig(kafka: KafkaProperties, sourceTopics: SbTechTopics, targetTopics: TargetTopics) {
  def getRegistry: String = sourceTopics.schemaRegistry
}

case class SbTechTopics(casinoBets: String,
                        customerDetails: String,
                        logins: String,
                        sportBetsInfo: String,
                        walletTransaction: String,
                        customerDeposit: String,
                        operatorEvents: String,
                        operatorMarkets: String,
                        operatorSelections: String,
                        offerEvents: String,
                        offerOptions: String,
                        schemaRegistry: String)

case class TargetTopics(casinoBets: String,
                        customerDetails: String,
                        logins: String,
                        sportBetsInfo: String,
                        walletTransaction: String,
                        customerDeposit: String,
                        operatorEvents: String,
                        operatorMarkets: String,
                        operatorSelections: String,
                        offerEvents: String,
                        offerOptions: String,
                        schemaRegistry: String)

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      casinoBets = config.getString("casino-bets"),
      customerDetails = config.getString("customer-details"),
      logins = config.getString("logins"),
      sportBetsInfo = config.getString("sport-bets-info"),
      walletTransaction = config.getString("wallet-transaction"),
      customerDeposit = config.getString("customer-deposit"),
      operatorEvents = config.getString("operator-events"),
      operatorMarkets = config.getString("operator-markets"),
      operatorSelections = config.getString("operator-selections"),
      offerEvents = config.getString("offer-events"),
      offerOptions = config.getString("offer-options"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SbTechTopics {
  def apply(config: Config): SbTechTopics = {
    SbTechTopics(
      casinoBets = config.getString("casino-bets"),
      customerDetails = config.getString("customer-details"),
      logins = config.getString("logins"),
      sportBetsInfo = config.getString("sport-bets-info"),
      walletTransaction = config.getString("wallet-transaction"),
      customerDeposit = config.getString("customer-deposit"),
      operatorEvents = config.getString("operator-events"),
      operatorMarkets = config.getString("operator-markets"),
      operatorSelections = config.getString("operator-selections"),
      offerEvents = config.getString("offer-events"),
      offerOptions = config.getString("offer-options"),
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