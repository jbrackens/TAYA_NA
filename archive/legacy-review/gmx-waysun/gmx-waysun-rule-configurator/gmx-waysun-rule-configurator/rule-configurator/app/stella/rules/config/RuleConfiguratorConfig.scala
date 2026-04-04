package stella.rules.config

import java.util.UUID

import scala.concurrent.duration.FiniteDuration

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._

import stella.common.core.config.BaseConfig
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt.config.JwtConfig
import stella.common.kafka.config.ProducerConfig
import stella.common.kafka.config.SerializerConfig
import stella.common.models.Ids.UserId
import stella.common.models.Ids.UserId._
import stella.common.models.instances._

final case class RuleConfiguratorKafkaConfig(
    bootstrapServers: String,
    serializer: SerializerConfig,
    eventProducer: RuleConfiguratorKafkaProducerConfig,
    aggregationProducer: RuleConfiguratorKafkaProducerConfig,
    achievementProducer: RuleConfiguratorKafkaProducerConfig)

final case class RuleConfiguratorKafkaProducerConfig(
    topicName: String,
    acks: String,
    clientId: String,
    compressionType: String,
    maxInFlightRequestsPerConnection: Int,
    maxNumberOfRetries: Option[Int],
    publicationTimeLimit: Option[FiniteDuration]) {

  def toCommonProducer: ProducerConfig =
    ProducerConfig(
      acks,
      clientId,
      compressionType,
      maxInFlightRequestsPerConnection,
      maxNumberOfRetries,
      publicationTimeLimit)
}

final case class RuleConfiguratorConfig(
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: UUID,
    jwt: JwtConfig,
    openApi: OpenApiConfig,
    kafka: RuleConfiguratorKafkaConfig)

object RuleConfiguratorConfig extends BaseConfig[RuleConfiguratorConfig]("stella.rule-configurator") {
  def loadConfig(): RuleConfiguratorConfig = {
    val config = ConfigFactory.load()
    RuleConfiguratorConfig(config)
  }
}
