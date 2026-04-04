package net.flipsports.gmx.streaming.common.configs

import java.util.Properties

import com.typesafe.config.Config
import net.flipsports.gmx.streaming.common.configs.KafkaProperties.schemaRegistryProperty
import org.apache.flink.util.StringUtils
import org.apache.kafka.clients.consumer.ConsumerConfig

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
    if (StringUtils.isNullOrWhitespaceOnly(offsetRestConfig)) {
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

  def withRegistry(url: String): KafkaProperties = {
    withRegistry(properties, url)
  }

  private def copyIntoProperties(target: Properties) = {
    properties.forEach((k, v) => target.put(k, v))
  }

  def withRegistry(properties: Properties, registry: String) = {
    val props = new Properties()
    props.put(schemaRegistryProperty, registry)
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