package net.flipsports.gmx.streaming.common.avro

import java.lang

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.api.common.serialization.SerializationSchema
import org.apache.flink.streaming.connectors.kafka.KafkaSerializationSchema
import org.apache.kafka.clients.producer.ProducerRecord

@Deprecated
class ValueSerializationSchema[V](val topic: String, serializer: SerializationSchema[V])
  extends KafkaSerializationSchema[V]
  with LazyLogging
  with Serializable {

  override def serialize(element: V, timestamp: lang.Long): ProducerRecord[Array[Byte], Array[Byte]] = {
    logger.debug(s"Serialization of message without key and value: {$element}")
    val value = serializer.serialize(element)
    logger.debug("Message serialized. Preparing producer record ")
    // null on partition allow to auto publish via kafka partitioner.
    new ProducerRecord(topic, null, timestamp, null, value)
  }
}
