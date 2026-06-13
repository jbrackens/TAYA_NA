package net.flipsports.gmx.streaming.sbtech.configs

import com.typesafe.config.{Config, ConfigFactory}
import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaConfig

case class SbTechConfig(
    kafka: KafkaConfig,
    kafkaTopics: SbTechTopics,
    schemaRegistry: String,
    useRegistry: Boolean,
    sources: Sources,
    targetTopics: TargetTopics,
    checkpoints: String
) {
  def getRegistry = if (useRegistry) Some(schemaRegistry) else None
}

case class SbTechTopics(
    casinoBets: String,
    customerDetails: String,
    sportBetsInfo: String,
    walletTransaction: String,
    customerDeposit: String,
    topicsPrefix: String
)

case class TargetTopics(
                         gmxMessaging: String,
                         gmxTracking: String,
                         rewardsPoint: String,
                         customerUpsert: String,
                         betsFiltered: String
                       )

object TargetTopics {
  def apply(config: Config): TargetTopics = {
    TargetTopics (
      gmxMessaging = config.getString("gmx-messaging"),
      gmxTracking = config.getString("gmx-tracking"),
      rewardsPoint = config.getString("rewards-point-topic"),
      customerUpsert = config.getString("customer-upsert-topic"),
      betsFiltered = config.getString("bets-filtered")
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
      topicsPrefix = config.getString("topics-prefix")
    )
  }
}

case class Sources(
                    sportNation: SourceBrand,
                    redZoneSports: SourceBrand,
                    emptyBrand: SourceBrand
)

object Sources {
  def apply(config: Config): Sources = {
    Sources(
      SourceBrand(config.getConfig("sportnation")),
      SourceBrand(config.getConfig("redzone")),
      SourceBrand(-1, "", "")
    )
  }
}

case class SourceBrand(id: Int, uuid: String, name: String)

object SourceBrand {

  def apply(config: Config): SourceBrand = new SourceBrand(
    id = config.getInt("id"),
    uuid = config.getString("uuid"),
    name = config.getString("name")
  )
}

object SbTechConfig {
  val name = "sbTech"

  def apply(config: Config): SbTechConfig = {
    SbTechConfig(
      kafka = KafkaConfig.apply(config.getConfig("kafka")),
      kafkaTopics = SbTechTopics.apply(config.getConfig("kafka-topics")),
      schemaRegistry = config.getString("schema-registry"),
      useRegistry = config.getBoolean("use-registry"),
      sources = Sources.apply(config.getConfig("sources")),
      targetTopics = TargetTopics.apply(config.getConfig("target-topics")),
      checkpoints = config.getString("checkpoints")
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
