package stella.leaderboard.ingestor.it.containers.kafka

import com.dimafeng.testcontainers.Container
import com.dimafeng.testcontainers.KafkaContainer
import com.dimafeng.testcontainers.MultipleContainers

/**
 * Copied from gmx-streaming-data-engine. Eventually to be replaced by the dependency to some commons project.
 * The Kafka / Confluent platform version had to be downgraded though and kafkaWithoutSchemaRegistryContainers is fixed
 */
trait ConfluentPlatformContainers {

  type SchemaRegistryUrl = String

  private lazy val kafkaContainer = KafkaContainer(confluentPlatformVersion())

  private lazy val schemaRegistryContainer = SchemaRegistryContainer(confluentPlatformVersion(), kafkaContainer)

  def withKafka[T](kafkaProperties: KafkaProperties)(test: (KafkaProperties, SchemaRegistryUrl) => T): T = {
    val kafkaBootstrap = kafkaContainer.bootstrapServers.replace("PLAINTEXT://", "")
    val registryUrl = schemaRegistryContainer.schemaRegistryUrl
    val updatedKafkaProperties = kafkaProperties.withBootstrapServer(kafkaBootstrap)
    test(updatedKafkaProperties, registryUrl)
  }

  def kafkaWithSchemaRegistryContainers: Container = MultipleContainers(kafkaContainer, schemaRegistryContainer)

  def kafkaWithoutSchemaRegistryContainers: Container = kafkaContainer

  def confluentPlatformVersion() = "5.3.1"
}
