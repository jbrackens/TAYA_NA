package phoenix.suppliers.oddin.kafka

import pureconfig.generic.auto._

import phoenix.core.config.BaseConfig

/**
 * A simplified representation of the Kafka consumer configuration that we will
 * actually care about setting.
 */
final case class SimpleConsumerConfig(bootstrapServers: String, groupId: String)

object SimpleConsumerConfig {
  object of extends BaseConfig[SimpleConsumerConfig]("phoenix.oddin.kafka.consumer")
}
