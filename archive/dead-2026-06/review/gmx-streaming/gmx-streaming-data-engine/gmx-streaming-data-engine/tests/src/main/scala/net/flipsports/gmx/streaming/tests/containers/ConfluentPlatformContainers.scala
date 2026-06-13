package net.flipsports.gmx.streaming.tests.containers

import com.dimafeng.testcontainers.{Container, MultipleContainers}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.testcontainers.containers.Network


trait ConfluentPlatformContainers {

  type SchemaRegistryUrl = String

  val network = Network.newNetwork()

  private lazy val kafkaContainer = WKafkaContainer(confluentPlatformVersion, network).get()

  private lazy val schemaRegistryContainer = SchemaRegistryContainer(confluentPlatformVersion, kafkaContainer, network)

  def withKafka[T](kafkaProperties: KafkaProperties)(test: (KafkaProperties, SchemaRegistryUrl)  => T): Unit = {
    kafkaContainer.start()
    schemaRegistryContainer.start()
    val kafkaBootstrap = kafkaContainer.bootstrapServers.replace("PLAINTEXT://", "")
    val registryUrl = schemaRegistryContainer.schemaRegistryUrl
    val updatedKafkaProperties = kafkaProperties.withBootstrapServer(kafkaBootstrap)
    test(updatedKafkaProperties, registryUrl)
  }

  def kafkaWithSchemaRegistryContainers : Container = MultipleContainers(kafkaContainer, schemaRegistryContainer)

  def kafkaWithoutSchemaRegistryContainers : Container = MultipleContainers(kafkaContainer, schemaRegistryContainer)

  def confluentPlatformVersion() = "5.4.3"
}

object ConfluentPlatformContainers {

  val kafkaHostName = "KAFKA_HOST_NAME"

}