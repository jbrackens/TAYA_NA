package net.flipsports.gmx.streaming.common.kafka.serializer

import java.io.ByteArrayOutputStream
import java.util

import org.apache.avro.generic.{GenericDatumWriter, GenericRecord}
import org.apache.avro.io.{BinaryEncoder, DatumWriter, EncoderFactory}
import org.apache.avro.reflect.ReflectDatumWriter
import org.apache.avro.specific.{SpecificDatumWriter, SpecificRecord, SpecificRecordBase}
import org.apache.kafka.common.serialization.Serializer

class AvroSerializer[VALUE <: SpecificRecord](clazz: Class[VALUE]) extends Serializer[VALUE] with Serializable {

  @transient
  private var encoder: BinaryEncoder = null

  @transient
  private[this] lazy val writer: DatumWriter[VALUE] = resolveDatWriter

  override def serialize(topic: String, data: VALUE): Array[Byte] = {
    // if performance will be slow - we should move writer and encoder to transient attributes of class
    val byteArrayOutputStream = new ByteArrayOutputStream()
    encoder = EncoderFactory.get().binaryEncoder(byteArrayOutputStream, encoder)
    if (data == null ) {
      encoder.writeNull()
    } else {
      writer.write(data, encoder)
    }
    encoder.flush
    byteArrayOutputStream.close
    byteArrayOutputStream.toByteArray
  }

  private def resolveDatWriter: DatumWriter[VALUE] = {
    val valueClass = clazz
    if (valueClass == classOf[GenericRecord]) {
      new GenericDatumWriter[VALUE]()
    } else if (classOf[SpecificRecordBase].isAssignableFrom(valueClass)) {
      new SpecificDatumWriter[VALUE](valueClass)
    } else {
      new ReflectDatumWriter[VALUE](valueClass)
    }
  }

  override def configure(configs: util.Map[String, _], isKey: Boolean): Unit = {
    // no - op
  }

  override def close(): Unit = {
    // no - op
  }
}

object AvroSerializer {

  def serializer[T<: SpecificRecord](clazz: Class[T]): Serializer[T] = new AvroSerializer[T](clazz).asInstanceOf[Serializer[T]]

}