package net.flipsports.gmx.streaming.common.avro

import java.io.ByteArrayOutputStream

import org.apache.avro.generic.{GenericDatumWriter, GenericRecord}
import org.apache.avro.io._
import org.apache.avro.reflect.ReflectDatumWriter
import org.apache.avro.specific.{SpecificDatumWriter, SpecificRecordBase}
import org.apache.flink.api.common.serialization.SerializationSchema

class AvroSerializationSchema[T](clazz: Class[T])
    extends SerializationSchema[T] {

  @transient
  private var encoder: BinaryEncoder = null

  @transient
  private[this] lazy val writer: DatumWriter[T] = resolveDatWriter

  override def serialize(message: T): Array[Byte] = {
    val byteArrayOutputStream = new ByteArrayOutputStream()
    encoder = EncoderFactory.get().binaryEncoder(byteArrayOutputStream, encoder)
    writer.write(message, encoder)
    encoder.flush
    byteArrayOutputStream.close
    byteArrayOutputStream.toByteArray
  }

  private def resolveDatWriter: DatumWriter[T] = {
    if (clazz == classOf[GenericRecord]) {
      new GenericDatumWriter[T]()
    } else if (classOf[SpecificRecordBase].isAssignableFrom(clazz)) {
      new SpecificDatumWriter[T](clazz)
    } else {
      new ReflectDatumWriter[T](clazz)
    }
  }

}
