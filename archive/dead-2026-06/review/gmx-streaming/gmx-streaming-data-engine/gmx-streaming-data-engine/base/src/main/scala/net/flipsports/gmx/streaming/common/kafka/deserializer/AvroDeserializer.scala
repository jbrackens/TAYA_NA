package net.flipsports.gmx.streaming.common.kafka.deserializer

import java.util

import org.apache.avro.specific.SpecificRecord
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.kafka.common.serialization.Deserializer

class AvroDeserializer[VALUE<: SpecificRecord](clazz: Class[VALUE]) extends Deserializer[VALUE] with Serializable {

  override def configure(configs: util.Map[String, _], isKey: Boolean): Unit = {
    // no - op
  }

  override def deserialize(topic: String, data: Array[Byte]): VALUE = {
    AvroDeserializationSchema.forSpecific[VALUE](clazz).deserialize(data)
  }

  override def close(): Unit = {
    // no - op
  }
}

object AvroDeserializer {

  def apply[T<: SpecificRecord](clazz: Class[T]): Deserializer[T] = new AvroDeserializer[T](clazz).asInstanceOf[Deserializer[T]]

}