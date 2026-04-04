package stella.events.config

import com.typesafe.config.ConfigFactory
import pureconfig.generic.auto._
import pureconfig.module.enumeratum._

import stella.common.core.config.BaseConfig
import stella.common.http.config.HttpServerConfig
import stella.common.http.config.OpenApiConfig
import stella.common.kafka.config.KafkaProducerConsumerConfig
import stella.common.models.Ids._
import stella.common.models.instances._

final case class EventIngestorConfig(
    enableInteractiveShutdown: Boolean,
    eventPublicationMode: EventPublicationMode,
    secretBoxHexKey: String,
    testUserId: UserId,
    testProjectId: ProjectId,
    httpServer: HttpServerConfig,
    openApi: OpenApiConfig,
    kafka: KafkaProducerConsumerConfig,
    redisPersistence: RedisPersistenceConfig)

final case class RedisPersistenceConfig(
    collectionName: String,
    eventToPublishCheckFrequencySeconds: Int,
    leaderLockName: String,
    redissonConfigInResources: Boolean,
    redissonConfigPath: String)

object EventIngestorConfig extends BaseConfig[EventIngestorConfig]("stella.event-ingestor") {
  def loadConfig(): EventIngestorConfig = {
    val config = ConfigFactory.load()
    EventIngestorConfig(config)
  }
}
