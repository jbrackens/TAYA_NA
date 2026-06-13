package net.flipsports.gmx.streaming.internal.customers.operation.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties

case class AppConfig(
    kafka: KafkaProperties,
    sourceTopics: SourceTopics,
    targetTopics: TargetTopics,
    features: Features = Features()
)

case class SourceTopics(
    customerDetails: String,
    walletTransactions: String,
    logins: String,
    schemaRegistry: String
)

case class TargetTopics(tags: String, customerAbuse: String, schemaRegistry: String)

case class Features(irishRegistration: Boolean = false,
                    faccountMobileCasinoRegistration: Boolean = false,
                    faccountMobileRegistration: Boolean = false,
                    faccountRegistration: Boolean = false,
                    faccountAffiliatesRegistration: Boolean = false,
                    faccountBlockRegistration: Boolean = false,
                    faccountBlockExtensionRegistration: Boolean = false,
                    canadianRegistration: Boolean = false,
                    undecidedRegistration: Boolean = false,
                    highValueCustomer: Boolean = false,
                    preferredSegmentPolicy: Boolean = false,
                    dummyPreJoinCustomer: Boolean = false,
                    dummyPreJoinLogin: Boolean = false,
                    dummyJoined: Boolean = false
) {
  def isAnyDummy(): Boolean = dummyPreJoinLogin || dummyPreJoinCustomer || dummyJoined

  def isAnyBuisness(): Boolean = faccountMobileCasinoRegistration || canadianRegistration || undecidedRegistration || highValueCustomer || faccountRegistration || faccountBlockRegistration
}

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      tags = config.getString("tags"),
      customerAbuse = config.getString("customer-abuse"),
      schemaRegistry = config.getString("schema-registry")
    )
  }
}

object SourceTopics {
  def apply(config: Config): SourceTopics = {
    SourceTopics(
      customerDetails = config.getString("customer-details"),
      logins = config.getString("logins"),
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