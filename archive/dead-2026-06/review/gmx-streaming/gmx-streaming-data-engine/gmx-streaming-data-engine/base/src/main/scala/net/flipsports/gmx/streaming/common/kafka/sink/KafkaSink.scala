package net.flipsports.gmx.streaming.common.kafka.sink

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.kafka.consumerschema.KeyValueProducerSchema
import net.flipsports.gmx.streaming.common.kafka.provider.SerializerProvider
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer

import scala.reflect.runtime.universe._

class KafkaSink(topic: String, properties: KafkaProperties, schemaRegistry: Option[String]) extends Serializable  {

  /**
   * Key Value Producer based on avro types with or without schema registry.
   */
  def keyAndValue[K <: SpecificRecord, V <: SpecificRecord](keyClazz: Class[K], valueClazz: Class[V]): FlinkKafkaProducer[Tuple2[K, V]] =
    withTimestamp {
      schemaRegistry match {
        case Some(registry) => new FlinkKafkaProducer[Tuple2[K, V]](
            topic,
            KeyValueProducerSchema(topic, SerializerProvider.SpecificRecords.keyAndValue(registry, keyClazz, valueClazz)),
            properties.properties,
            FlinkKafkaProducer.Semantic.AT_LEAST_ONCE)
        case None => new FlinkKafkaProducer[Tuple2[K, V]](
          topic,
          KeyValueProducerSchema(topic, SerializerProvider.SpecificRecords.keyAndValue(keyClazz, valueClazz)),
          properties.properties,
          FlinkKafkaProducer.Semantic.AT_LEAST_ONCE)
      }
    }

  def typedKeyAndValue[K : TypeTag, V <: SpecificRecord](keyClazz: Class[K], valueClazz: Class[V]): FlinkKafkaProducer[Tuple2[K, V]] =
    withTimestamp {
      schemaRegistry match {
        case Some(registry) => new FlinkKafkaProducer[Tuple2[K, V]](
          topic,
          KeyValueProducerSchema(topic, SerializerProvider.MixedSpecificRecords.typedKeyAndSpecificValue[K, V](registry, keyClazz, valueClazz)),
          properties.properties,
          FlinkKafkaProducer.Semantic.AT_LEAST_ONCE)
        case None =>  new FlinkKafkaProducer[Tuple2[K, V]](
          topic,
          KeyValueProducerSchema(topic, SerializerProvider.MixedSpecificRecords.typedKeyAndSpecificValue[K, V](keyClazz, valueClazz)),
          properties.properties,
          FlinkKafkaProducer.Semantic.AT_LEAST_ONCE)
      }
    }

  private def withTimestamp[RECORD](producer: FlinkKafkaProducer[RECORD]): FlinkKafkaProducer[RECORD] = {
    producer.setWriteTimestampToKafka(true)
    producer
  }
}

object KafkaSink {

  def apply(topic: String, kafkaProperties: KafkaProperties) = new KafkaSink(topic, kafkaProperties, None)

  def apply(topic: String, kafkaProperties: KafkaProperties, registry: String) = new KafkaSink(topic, kafkaProperties, Some(registry))

}
