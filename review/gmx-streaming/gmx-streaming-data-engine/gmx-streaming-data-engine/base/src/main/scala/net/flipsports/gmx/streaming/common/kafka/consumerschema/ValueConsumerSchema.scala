package net.flipsports.gmx.streaming.common.kafka.consumerschema

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.kafka.provider.BinaryIO
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.streaming.connectors.kafka.KafkaDeserializationSchema
import org.apache.kafka.clients.consumer.ConsumerRecord

class ValueConsumerSchema[V](keyAndValueDes:  () => BinaryIO.Des[Unit, V])
  extends KafkaDeserializationSchema[V]
    with LazyLogging
    with Serializable {

  @transient
  private[this] lazy val deserializer = keyAndValueDes()

  override def isEndOfStream(nextElement: V): Boolean = false

  override def deserialize(record: ConsumerRecord[Array[Byte], Array[Byte]]): V = {
    logger.debug(s"Serialization of message without key and value: {$record}")
    deserializer.value.io.deserialize(record.topic(), record.headers(), record.value())
  }

  override def getProducedType: TypeInformation[V] = keyAndValueDes().value.typeInformation
}


object ValueConsumerSchema {

  def apply[V](keyAndValueDes: () => BinaryIO.Des[Unit, V]): KafkaDeserializationSchema[V] = new ValueConsumerSchema[V](keyAndValueDes)

}
