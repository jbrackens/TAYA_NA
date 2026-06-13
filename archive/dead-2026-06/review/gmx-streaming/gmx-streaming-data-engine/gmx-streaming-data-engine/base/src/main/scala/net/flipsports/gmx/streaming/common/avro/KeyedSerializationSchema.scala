package net.flipsports.gmx.streaming.common.avro

import java.lang

import com.typesafe.scalalogging.LazyLogging
import org.apache.flink.api.common.serialization.SerializationSchema
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.KafkaSerializationSchema
import org.apache.kafka.clients.producer.ProducerRecord

@Deprecated
class KeyedSerializationSchema[K, V](val topic: String, keySerializer: SerializationSchema[K], valueSerializer: SerializationSchema[V])
  extends KafkaSerializationSchema[Tuple2[K, V]]
  with LazyLogging
  with Serializable {

  override def serialize(element: Tuple2[K, V], timestamp: lang.Long): ProducerRecord[Array[Byte], Array[Byte]] = {
    logger.debug(s"Serialization of message with key: {${element.f0} and value: {${element.f1}")
    val key = serializeKey(element)
    val value = serializeValue(element)
    logger.debug("Message serialized. Preparing producer record ")
    // null on partition allow to auto publish via kafka partitioner.
    new ProducerRecord(topic, null, timestamp, key, value)
  }

  private def serializeKey(element: Tuple2[K, V]): Array[Byte] = element.f0 match {
    case null => null
    case _ => keySerializer.serialize(element.f0)
  }

  private def serializeValue(element: Tuple2[K, V]): Array[Byte] = valueSerializer.serialize(element.f1)

}
