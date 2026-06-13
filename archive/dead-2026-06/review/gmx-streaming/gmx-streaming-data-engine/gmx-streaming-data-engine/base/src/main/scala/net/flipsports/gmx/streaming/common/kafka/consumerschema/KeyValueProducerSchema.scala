package net.flipsports.gmx.streaming.common.kafka.consumerschema

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.kafka.provider.BinaryIO
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.KafkaSerializationSchema
import org.apache.kafka.clients.producer.ProducerRecord

class KeyValueProducerSchema[KEY, VALUE](val topic: String, binaryIO: () => BinaryIO.Ser[KEY, VALUE])
  extends KafkaSerializationSchema[Tuple2[KEY, VALUE]]
    with LazyLogging
    with Serializable {

  @transient
  private[this] lazy val serializer = binaryIO()

  override def serialize(element: Tuple2[KEY, VALUE], timestamp: java.lang.Long): ProducerRecord[Array[Byte], Array[Byte]] = {
    logger.debug(s"Serialization of message with key: {${element.f0} and value: {${element.f1}")
    val key = serializer.key.get.io.serialize(topic, element.f0)
    val value = serializer.value.io.serialize(topic, element.f1)
    logger.debug("Message serialized. Preparing producer record ")
    // null on partition allow to auto publish via kafka partitioner.

    withPositiveTimestamp(timestamp) { time =>
      new ProducerRecord(topic, null, time, key, value)
    }
  }

  def extractTimestamp(timestamp: java.lang.Long) : java.lang.Long = {
    if (timestamp == null || timestamp <= 0) {
      System.currentTimeMillis()
    } else {
      timestamp
    }
  }

}

object KeyValueProducerSchema {

  def apply[K, V](topic: String, provider: () => BinaryIO.Ser[K,V]): KafkaSerializationSchema[Tuple2[K, V]] = new KeyValueProducerSchema[K, V](topic, provider)

}




