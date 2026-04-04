package stella.events.http.routes

import scala.concurrent.ExecutionContext
import scala.io.Source

import akka.actor.typed.ActorSystem
import akka.actor.typed.Scheduler
import akka.actor.typed.scaladsl.Behaviors
import com.softwaremill.macwire.wire
import com.softwaremill.macwire.wireWith
import org.redisson.config.{Config => RedissonConfig}
import sttp.tapir.server.akkahttp.AkkaHttpServerInterpreter
import sttp.tapir.server.akkahttp.AkkaHttpServerOptions

import stella.common.core.Clock
import stella.common.core.JavaOffsetDateTimeClock
import stella.common.http.config.OpenApiConfig
import stella.common.http.jwt._
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl
import stella.common.kafka.config.KafkaConsumerConfig
import stella.common.kafka.config.KafkaProducerConfig
import stella.common.kafka.config.KafkaProducerConsumerConfig
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

import stella.events.EventIngestorBoundedContext
import stella.events.EventIngestorBoundedContextImpl
import stella.events.RandomUuidMessageIdProvider
import stella.events.config.EventIngestorConfig
import stella.events.config.EventPublicationMode.PublishDirectlyToKafka
import stella.events.config.EventPublicationMode.StoreInRedis
import stella.events.config.EventPublicationMode.StoreInRedisAndStartKafkaPublicationService
import stella.events.config.RedisPersistenceConfig
import stella.events.http.StellaAkkaHttpServerOptions
import stella.events.persistence.EventPublicationScheduler
import stella.events.persistence.EventPublisher
import stella.events.persistence.KafkaConsumerService
import stella.events.persistence.KafkaConsumerServiceImpl
import stella.events.persistence.KafkaPersistenceService
import stella.events.persistence.PersistenceService
import stella.events.persistence.RedisPersistenceService

trait EventIngestorRoutesModule {
  implicit val system: ActorSystem[Unit] = ActorSystem(Behaviors.empty, "stella-event-ingestor")
  implicit val executionContext: ExecutionContext = system.executionContext

  lazy val config: EventIngestorConfig = wireWith(EventIngestorConfig.loadConfig _)

  lazy val kafkaConfig: KafkaProducerConsumerConfig = config.kafka
  lazy val kafkaProducerConfig: KafkaProducerConfig = config.kafka.toKafkaProducerConfig
  lazy val kafkaConsumerConfig: KafkaConsumerConfig = config.kafka.toKafkaConsumerConfig
  lazy val redisPersistenceConfig: RedisPersistenceConfig = config.redisPersistence
  implicit val clock: Clock = JavaOffsetDateTimeClock
  implicit val messageIdProvider: RandomUuidMessageIdProvider.type = RandomUuidMessageIdProvider

  lazy val kafkaPublisher: KafkaPublicationService[EventKey, EventEnvelope] =
    wire[KafkaPublicationServiceImpl[EventKey, EventEnvelope]]
  lazy val consumerService: KafkaConsumerService = wire[KafkaConsumerServiceImpl]
  lazy val scheduler: Scheduler = system.scheduler
  lazy val redissonConfig: RedissonConfig =
    RedissonConfig.fromYAML(
      if (redisPersistenceConfig.redissonConfigInResources)
        Source.fromResource(redisPersistenceConfig.redissonConfigPath).reader()
      else
        Source.fromFile(redisPersistenceConfig.redissonConfigPath).reader())

  lazy val persistenceService: PersistenceService = config.eventPublicationMode match {
    case StoreInRedis | StoreInRedisAndStartKafkaPublicationService => wire[RedisPersistenceService]
    case PublishDirectlyToKafka                                     => wire[KafkaPersistenceService]
  }

  lazy val eventPublisher: EventPublisher = wire[EventPublicationScheduler]
  lazy val eventIngestorBoundedContext: EventIngestorBoundedContext = wire[EventIngestorBoundedContextImpl]

  def openApiConfig: OpenApiConfig = config.openApi
  implicit lazy val jwtAuthorization: JwtAuthorization[StellaAuthContext] = wireWith(createJwtAuthorizationInstance _)

  lazy val serverOptions: AkkaHttpServerOptions = StellaAkkaHttpServerOptions.instance
  lazy val serverInterpreter: AkkaHttpServerInterpreter = AkkaHttpServerInterpreter(serverOptions)

  lazy val routes: EventIngestorRoutes = wire[EventIngestorRoutes]

  private def createJwtAuthorizationInstance(config: EventIngestorConfig): JwtAuthorization[StellaAuthContext] = {
    val jwtConfig = config.httpServer.jwt
    if (jwtConfig.requireJwtAuth) {
      val oidcPropertiesProvider = new OidcDiscovery(jwtConfig)
      val authContextExtractor = new SecretBoxAuthContextExtractor(config.secretBoxHexKey)
      new JwksBasedJwtAuthorization[StellaAuthContext](jwtConfig, oidcPropertiesProvider, authContextExtractor)
    } else new DisabledJwtAuthorization(dummyUserId = config.testUserId, dummyProjectId = config.testProjectId)
  }
}
