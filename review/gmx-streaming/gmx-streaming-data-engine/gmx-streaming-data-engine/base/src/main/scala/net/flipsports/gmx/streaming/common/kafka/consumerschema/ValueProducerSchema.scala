package net.flipsports.gmx.streaming.common.kafka.consumerschema

import java.lang

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.kafka.provider.BinaryIO
import org.apache.flink.streaming.connectors.kafka.KafkaSerializationSchema
import org.apache.kafka.clients.producer.ProducerRecord

class ValueProducerSchema[V](val topic: String, binaryIO: () => BinaryIO.Ser[Unit, V])
  extends KafkaSerializationSchema[V]
    with LazyLogging
    with Serializable {

  @transient
  private[this] lazy val serializer = binaryIO()

  override def serialize(element: V, timestamp: lang.Long): ProducerRecord[Array[Byte], Array[Byte]] = {
    logger.debug(s"Serialization of message without key and value: {$element}")
    val value = serializer.value.io.serialize(topic, element)
    logger.debug("Message serialized. Preparing producer record ")
    // null on partition allow to auto publish via kafka partitioner.
    withPositiveTimestamp(timestamp) { time =>
      new ProducerRecord(topic, null, time, null, value)
    }
  }

}

object ValueProducerSchema {

  def apply[V](topic: String, binaryIO: () => BinaryIO.Ser[Unit, V]): KafkaSerializationSchema[V] = new ValueProducerSchema[V](topic, binaryIO)

}

