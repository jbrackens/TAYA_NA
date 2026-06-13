package net.flipsports.gmx.streaming.tests.containers

import com.dimafeng.testcontainers.{ContainerDef, KafkaContainer, SingleContainer}
import org.testcontainers.containers.Network

class SchemaRegistryContainer(confluentPlatformVersion: Option[String] = None, kafkaContainer: KafkaContainer, network: Network) extends SingleContainer[JSchemaRegistryContainer] {

  val schemaRegistry: JSchemaRegistryContainer = confluentPlatformVersion match {
    case Some(version) => new JSchemaRegistryContainer(version, kafkaContainer.container, network)
    case None => new JSchemaRegistryContainer(kafkaContainer.container, network)
  }

  override val container: JSchemaRegistryContainer = schemaRegistry

  def schemaRegistryUrl = container.schemaRegistryUrl()
}

object SchemaRegistryContainer {

  val defaultTag = "5.2.1"

  def apply(confluentPlatformVersion: String = null, kafkaContainer: KafkaContainer, network: Network): SchemaRegistryContainer = new SchemaRegistryContainer(Option(confluentPlatformVersion), kafkaContainer, network)

  case class Def(confluentPlatformVersion: String = defaultTag, kafkaContainer: KafkaContainer, network: Network) extends ContainerDef {

    override type Container = SchemaRegistryContainer

    override def createContainer(): SchemaRegistryContainer = new SchemaRegistryContainer(confluentPlatformVersion = Some(confluentPlatformVersion), kafkaContainer, network)
  }
}
