package net.flipsports.gmx.streaming.common.kafka.source

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.kafka.consumerschema.{KeyValueConsumerSchema, ValueConsumerSchema}
import net.flipsports.gmx.streaming.common.kafka.provider.DeserializerProvider
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer

class KafkaSource(topic: String, properties: KafkaProperties, schemaRegistry: Option[String]) extends Serializable  {

  def specificKeyValue[K <: SpecificRecord, V <: SpecificRecord](keyClass: Class[K], valueClass: Class[V]): FlinkKafkaConsumer[Tuple2[K, V]] = withStartFromGroupOffset {
    schemaRegistry match {
      case Some(registry) => new FlinkKafkaConsumer[Tuple2[K, V]](
        topic,
        KeyValueConsumerSchema[K, V](DeserializerProvider.SpecificRecord.keyAndValue(registry, keyClass, valueClass)),
        properties.properties
      )
      case _ => throw new IllegalArgumentException("Missing kafka schema registry endpoint")
    }
  }

  def specificValue[V <: SpecificRecord](clazz: Class[V]): FlinkKafkaConsumer[V] = withStartFromGroupOffset {
    schemaRegistry match {
      case Some(registry) => new FlinkKafkaConsumer[V](
        topic,
        ValueConsumerSchema[V](DeserializerProvider.SpecificRecord.value(registry, clazz)),
        properties.properties
      )
      case _ => throw new IllegalArgumentException("Missing kafka schema registry endpoint")
    }
  }

  def jsonValue[V](valueClass: Class[V]): FlinkKafkaConsumer[V] = withStartFromGroupOffset {
    new FlinkKafkaConsumer[V](
      topic,
      ValueConsumerSchema[V](DeserializerProvider.JsonRecord.value(valueClass)),
      properties.properties)
  }

  def jsonKeyValue[K, V](keyClass: Class[K], valueClass: Class[V]): FlinkKafkaConsumer[Tuple2[K, V]] = withStartFromGroupOffset {
    new FlinkKafkaConsumer[Tuple2[K, V]](
      topic,
      KeyValueConsumerSchema[K, V](DeserializerProvider.JsonRecord.keyValue[K, V](keyClass, valueClass)),
      properties.properties)
  }

  def withStartFromGroupOffset[Record](f:  => FlinkKafkaConsumer[Record]): FlinkKafkaConsumer[Record] = {
    val consumer = f
    consumer.setStartFromGroupOffsets()
    consumer
  }

}

object KafkaSource {



  def apply(topic: String, kafkaProperties: KafkaProperties) = new KafkaSource(topic, kafkaProperties, None)

  def apply(topic: String, kafkaProperties: KafkaProperties, registry: String) = new KafkaSource(topic, kafkaProperties, Some(registry))

}
