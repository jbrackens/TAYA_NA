package net.flipsports.gmx.streaming.common.job.kafka

import net.flipsports.gmx.streaming.common.configs.{KafkaConfig, KafkaProperties}
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.formats.avro.registry.confluent.ConfluentRegistryAvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer
import org.apache.kafka.clients.consumer.ConsumerConfig

trait KafkaBinarySource extends KafkaProperties {

  def source: Option[String] = None

  def schemaRegistry: Option[String] = None

  def groupId: String

  /**
    * If there is no offset - kafka will start's consuming from beginning
    */
  def consumer[S <: SpecificRecord](clazz: Class[S]): FlinkKafkaConsumer[S] = consumerWithTopic(clazz, source.get)

  def consumerWithTopic[S <: SpecificRecord](clazz: Class[S], topic: String): FlinkKafkaConsumer[S] = {
    properties.put(ConsumerConfig.GROUP_ID_CONFIG, groupId)
    val consumer = schemaRegistry match {
      case Some(url) => new FlinkKafkaConsumer[S](source.get, ConfluentRegistryAvroDeserializationSchema.forSpecific[S](clazz, url), properties)
      case _ => new FlinkKafkaConsumer[S](source.get, AvroDeserializationSchema.forSpecific[S](clazz), properties)
    }
    consumer
      .setStartFromGroupOffsets()
    consumer
  }

}
