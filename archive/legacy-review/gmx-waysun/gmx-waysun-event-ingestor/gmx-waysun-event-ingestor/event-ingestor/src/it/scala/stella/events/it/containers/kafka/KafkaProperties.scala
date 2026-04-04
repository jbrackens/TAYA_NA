package stella.events.it.containers.kafka

import java.util.Properties

import com.typesafe.config.Config
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.testcontainers.shaded.org.apache.commons.lang.StringUtils

/** Copied from gmx-streaming-data-engine. Eventually to be replaced by the dependency to some commons project */
case class KafkaProperties(properties: Properties = new Properties) extends Serializable {

  def withGroupId(groupId: String): KafkaProperties = {
    val props = new Properties()
    props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId)
    copyIntoProperties(props)
    KafkaProperties(props)
  }

  def withBootstrapServer(bootstrapServer: String): KafkaProperties = {
    val props = new Properties()
    props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServer)
    copyIntoProperties(props)
    KafkaProperties(props)
  }

  def withOffsetResetConfig(offsetRestConfig: String): KafkaProperties = {
    if (StringUtils.isBlank(offsetRestConfig)) {
      val props = new Properties()
      props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
      copyIntoProperties(props)
      KafkaProperties(props)
    } else {
      val props = new Properties()
      props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, offsetRestConfig)
      copyIntoProperties(props)
      KafkaProperties(props)
    }

  }

  def withApplicationId(applicationId: String): KafkaProperties = {
    val props = new Properties()
    props.put(ConsumerConfig.CLIENT_ID_CONFIG, applicationId)
    copyIntoProperties(props)
    KafkaProperties(props)
  }

  private def copyIntoProperties(target: Properties): Unit = {
    val _ = properties.forEach((k, v) => target.put(k, v): Unit)
  }

  def withRegistry(registry: String): KafkaProperties = {
    val props = new Properties()
    props.put(KafkaProperties.schemaRegistryProperty, registry)
    copyIntoProperties(props)
    KafkaProperties(props)
  }

}

object KafkaProperties {

  val schemaRegistryProperty = "schema.registry.url"

  def apply(config: Config): KafkaProperties = KafkaProperties()
    .withBootstrapServer(config.getString("bootstrap"))
    .withOffsetResetConfig(config.getString("offset-config"))
}
