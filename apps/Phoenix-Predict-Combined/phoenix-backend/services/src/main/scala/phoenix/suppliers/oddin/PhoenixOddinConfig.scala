package phoenix.suppliers.oddin

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

case class KafkaConsumerConfig(bootstrapServers: String, groupId: String)

case class KafkaConfig(enabled: Boolean, consumer: KafkaConsumerConfig)

case class PhoenixOddinConfig(dataIngestionEnabled: Boolean, kafka: KafkaConfig, useCommonDataApiModel: Boolean)

object PhoenixOddinConfig {
  object of extends BaseConfig[PhoenixOddinConfig]("phoenix.oddin")
}
