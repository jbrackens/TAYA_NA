package net.flipsports.gmx.streaming.common.avro

import java.io.ByteArrayOutputStream

import io.confluent.kafka.schemaregistry.client.{CachedSchemaRegistryClient, SchemaRegistryClient}
import io.confluent.kafka.serializers.KafkaAvroSerializer
import org.apache.avro.generic.{GenericDatumWriter, GenericRecord}
import org.apache.avro.io._
import org.apache.avro.reflect.ReflectDatumWriter
import org.apache.avro.specific.{SpecificDatumWriter, SpecificRecordBase}
import org.apache.flink.api.common.serialization.SerializationSchema
import org.apache.flink.api.common.typeinfo.TypeInformation

import scala.collection.JavaConverters._

@Deprecated
class AvroSerializationSchema[VALUE](isKey: Boolean = false, valueTypeInformation: TypeInformation[VALUE], topic: String, schemaRegistry: Option[String], registryClient: Option[SchemaRegistryClient]) extends SerializationSchema[VALUE]
  with Serializable {

  @transient
  private var encoder: BinaryEncoder = null

  @transient
  private[this] lazy val writer: DatumWriter[VALUE] = resolveDatWriter

  @transient
  private[this] lazy val schemaRegistryWriter = resolveSchemaRegistryWriter

  override def serialize(element: VALUE): Array[Byte] = {
    schemaRegistry match {
      case Some(registry) => withSchemaRegistrySerializer(element)
      case None => withoutSchemaRegistrySerializer(element)
    }

  }

  private def withoutSchemaRegistrySerializer(element: VALUE): Array[Byte] = {
    val byteArrayOutputStream = new ByteArrayOutputStream()
    encoder = EncoderFactory.get().binaryEncoder(byteArrayOutputStream, encoder)
    if (element == null ) {
      encoder.writeNull()
    } else {
      writer.write(element, encoder)
    }
    encoder.flush
    byteArrayOutputStream.close
    byteArrayOutputStream.toByteArray
  }

  private def withSchemaRegistrySerializer(element: VALUE): Array[Byte] = {
    schemaRegistryWriter.serialize(topic, element)
  }


  private def resolveDatWriter: DatumWriter[VALUE] = {
    val valueClass = valueTypeInformation.getTypeClass
    if (valueClass == classOf[GenericRecord]) {
      new GenericDatumWriter[VALUE]()
    } else if (classOf[SpecificRecordBase].isAssignableFrom(valueClass)) {
      new SpecificDatumWriter[VALUE](valueClass)
    } else {
      new ReflectDatumWriter[VALUE](valueClass)
    }
  }

  private def resolveSchemaRegistryWriter = {
    val serializer = new KafkaAvroSerializer(registryClient.getOrElse(new CachedSchemaRegistryClient(schemaRegistry.get, 3)))
    val properties = Map("schema.registry.url" -> schemaRegistry.get)
    serializer.configure(properties.asJava, isKey)
    serializer
  }


}
