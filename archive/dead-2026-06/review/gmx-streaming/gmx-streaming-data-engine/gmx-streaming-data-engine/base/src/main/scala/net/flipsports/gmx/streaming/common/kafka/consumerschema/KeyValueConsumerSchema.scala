package net.flipsports.gmx.streaming.common.kafka.consumerschema

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.kafka.provider.BinaryIO
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.TupleTypeInfo
import org.apache.flink.streaming.connectors.kafka.KafkaDeserializationSchema
import org.apache.kafka.clients.consumer.ConsumerRecord

class KeyValueConsumerSchema[KEY, VALUE](keyAndValueDes: () => BinaryIO.Des[KEY, VALUE])
  extends KafkaDeserializationSchema[Tuple2[KEY, VALUE]]
    with LazyLogging
    with Serializable {

  @transient
  private[this] lazy val deserializers = keyAndValueDes()

  override def isEndOfStream(nextElement: Tuple2[KEY, VALUE]): Boolean = false

  override def deserialize(record: ConsumerRecord[Array[Byte], Array[Byte]]): Tuple2[KEY, VALUE] = {
    logger.debug(s"Deserialization of message with key and value: {$record}")
    val keyDeserializer = deserializers.key.get.io
    val valueDeserializer = deserializers.value.io
    val key = keyDeserializer.deserialize(record.topic(), record.headers(), record.key())
    val value = valueDeserializer.deserialize(record.topic(), record.headers(), record.value())
    new Tuple2[KEY, VALUE](key, value)
  }

  override def getProducedType: TypeInformation[Tuple2[KEY, VALUE]] = {
    val binaryIO = deserializers
    new TupleTypeInfo[Tuple2[KEY, VALUE]](binaryIO.key.get.typeInformation, binaryIO.value.typeInformation)
  }

}

object KeyValueConsumerSchema {

  def apply[K, V](provider: () => BinaryIO.Des[K,V]): KafkaDeserializationSchema[Tuple2[K, V]] = new KeyValueConsumerSchema[K, V](provider)

}