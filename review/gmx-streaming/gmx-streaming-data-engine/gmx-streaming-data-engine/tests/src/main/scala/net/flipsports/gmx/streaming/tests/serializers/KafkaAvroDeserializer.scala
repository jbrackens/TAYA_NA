package net.flipsports.gmx.streaming.tests.serializers

import java.util

import org.apache.avro.Schema
import org.apache.avro.io.DecoderFactory
import org.apache.avro.specific.{SpecificDatumReader, SpecificRecord}
import org.apache.kafka.common.serialization.Deserializer

class KafkaAvroDeserializer[T <: SpecificRecord](schema: Schema) extends Deserializer[T] {

  private val reader = new SpecificDatumReader[T](schema)

  override def deserialize(topic: String, data: Array[Byte]): T = {
    val decoder = DecoderFactory.get().binaryDecoder(data, null)
    reader.read(null.asInstanceOf[T], decoder)
  }

  override def configure(configs: util.Map[String, _], isKey: Boolean): Unit = {
    // no-op
  }

  override def close(): Unit = {
    // no-op
  }
}
