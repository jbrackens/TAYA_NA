package net.flipsports.gmx.streaming.common.configs

import java.util.{Properties, UUID}

import com.typesafe.config.Config
import org.apache.commons.lang3.StringUtils
import org.apache.flink.api.java.utils.ParameterTool
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.producer.ProducerConfig

case class KafkaConfig(bootstrap: String,  offsetConfig: String, customProperties: Properties) {
  def properties: Properties = {
    val properties = customProperties
    properties.setProperty(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrap)
    properties.setProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, offsetConfig)
    properties
  }

}

object KafkaConfig {

  def apply(config: Config): KafkaConfig = {
    val systemBootstrapEnv = getSystemBootstrapProperty

    new KafkaConfig(
      systemBootstrapEnv.getOrElse(config.getString("bootstrap")),
      config.getString("offset-config"),
      new Properties
    )
  }

  def apply(host: String, port: Int, offsetConfig: String , customProperties: Properties = new Properties): KafkaConfig = KafkaConfig(s"${host}:${port}", offsetConfig, customProperties)


  private def getSystemBootstrapProperty: Option[String] = {
    val systemEnvs = ParameterTool.fromMap(System.getenv())
    val host = systemEnvs.get("KAFKA_HOST")
    val port = systemEnvs.get("KAFKA_PORT")
    if (StringUtils.isAnyEmpty(host, port)) {
      None
    } else {
      Some(s"${host}:${port}")
    }
  }
}
