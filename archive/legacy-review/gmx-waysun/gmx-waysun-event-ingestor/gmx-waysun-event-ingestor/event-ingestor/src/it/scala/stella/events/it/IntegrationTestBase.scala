package stella.events.it

import java.nio.charset.StandardCharsets
import java.nio.file.Files

import scala.concurrent.duration.DurationInt
import scala.concurrent.duration.FiniteDuration

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.ForEachTestContainer
import com.dimafeng.testcontainers.MultipleContainers
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.scalatest.Suite
import org.scalatest.concurrent.Eventually
import org.scalatest.time.Millis
import org.scalatest.time.Seconds
import org.scalatest.time.Span

import stella.common.core.Clock

import stella.events.config.EventIngestorConfig
import stella.events.http.routes.EventIngestorRoutesModule
import stella.events.it.containers.kafka.ConfluentPlatformContainers
import stella.events.it.containers.kafka.KafkaProperties
import stella.events.it.containers.redis.RedisContainer

trait IntegrationTestBase
    extends ForEachTestContainer
    with RedisContainer
    with ConfluentPlatformContainers
    with Eventually { self: Suite =>

  override val container: Container = MultipleContainers(redisContainer, kafkaWithSchemaRegistryContainers)

  implicit override val patienceConfig: PatienceConfig =
    PatienceConfig(timeout = scaled(Span(15, Seconds)), interval = scaled(Span(50, Millis)))

  protected val awaitTimeout: FiniteDuration = 20.seconds

  protected def prepareEventIngestorConfig(): EventIngestorConfig = {
    withKafka(KafkaProperties()) { case (kafkaProperties, schemaRegistryUrl) =>
      val config = EventIngestorConfig.loadConfig()

      val kafkaConfig = config.kafka
      val kafkaConfigWithTestAddresses = kafkaConfig.copy(
        bootstrapServers = kafkaProperties.properties.getProperty(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG),
        serializer = kafkaConfig.serializer.copy(schemaRegistryUrl = schemaRegistryUrl))

      val redisHost = redisContainer.container.getContainerIpAddress
      val redisPort = redisMappedPort
      val redissonConfig = s"""
      |singleServerConfig:
      |  address: redis://$redisHost:$redisPort
      |  retryAttempts: 0
      |lockWatchdogTimeout: 1000
      |codec:
      |  class: org.redisson.codec.Kryo5Codec
      |""".stripMargin
      val tempRedissonConfig = Files.createTempFile("temp-redisson-conf", ".yaml")
      Files.write(tempRedissonConfig.toAbsolutePath, redissonConfig.getBytes(StandardCharsets.UTF_8))

      val redissonConfigWithTestAddress = config.redisPersistence.copy(
        eventToPublishCheckFrequencySeconds = 1,
        redissonConfigInResources = false,
        redissonConfigPath = tempRedissonConfig.toAbsolutePath.toString)
      config.copy(kafka = kafkaConfigWithTestAddresses, redisPersistence = redissonConfigWithTestAddress)
    }
  }

  protected def eventIngestorRoutesModule(testClock: Clock) = new EventIngestorRoutesModule {
    override lazy val config: EventIngestorConfig = prepareEventIngestorConfig()
    override implicit val clock: Clock = testClock
  }
}
