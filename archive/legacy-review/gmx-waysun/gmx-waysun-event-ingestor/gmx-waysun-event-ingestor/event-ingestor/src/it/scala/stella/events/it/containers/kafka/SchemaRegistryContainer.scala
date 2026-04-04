package stella.events.it.containers.kafka

import com.dimafeng.testcontainers.ContainerDef
import com.dimafeng.testcontainers.KafkaContainer
import com.dimafeng.testcontainers.SingleContainer

/** Copied from gmx-streaming-data-engine. Eventually to be replaced by the dependency to some commons project */
class SchemaRegistryContainer(confluentPlatformVersion: Option[String] = None, kafkaContainer: KafkaContainer)
    extends SingleContainer[JSchemaRegistryContainer] {

  val schemaRegistry: JSchemaRegistryContainer = confluentPlatformVersion match {
    case Some(version) => new JSchemaRegistryContainer(version, kafkaContainer.container)
    case None          => new JSchemaRegistryContainer(kafkaContainer.container)
  }

  override val container: JSchemaRegistryContainer = schemaRegistry

  def schemaRegistryUrl = container.schemaRegistryUrl()
}

object SchemaRegistryContainer {

  val defaultTag = "5.2.0"

  def apply(confluentPlatformVersion: String = None.orNull, kafkaContainer: KafkaContainer): SchemaRegistryContainer =
    new SchemaRegistryContainer(Option(confluentPlatformVersion), kafkaContainer)

  case class Def(confluentPlatformVersion: String = defaultTag, kafkaContainer: KafkaContainer) extends ContainerDef {

    override type Container = SchemaRegistryContainer

    override def createContainer(): SchemaRegistryContainer =
      new SchemaRegistryContainer(confluentPlatformVersion = Some(confluentPlatformVersion), kafkaContainer)
  }
}
