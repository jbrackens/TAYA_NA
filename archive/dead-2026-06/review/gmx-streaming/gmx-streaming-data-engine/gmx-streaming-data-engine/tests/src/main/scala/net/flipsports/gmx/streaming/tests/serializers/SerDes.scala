package net.flipsports.gmx.streaming.tests.serializers

import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient
import io.confluent.kafka.serializers.KafkaAvroSerializer
import net.flipsports.gmx.streaming.common.avro.AvroSerializationSchema
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.apache.avro.Schema
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.typeinfo.TypeInformation

import scala.collection.JavaConverters._

object SerDes {

  def toStringSerDes = new org.apache.kafka.common.serialization.StringSerializer

  def fromString = new org.apache.kafka.common.serialization.StringSerializer

  def fromLong = new org.apache.kafka.common.serialization.LongDeserializer

  def toLong = new org.apache.kafka.common.serialization.LongSerializer

  def toBinary[V ](key: => Boolean, valueTypeInformation: TypeInformation[V]) = new AvroSerializationSchema[V](key, valueTypeInformation, "", None, None)

  def fromBinary[T <: SpecificRecord](schema: Schema) = new net.flipsports.gmx.streaming.tests.serializers.KafkaAvroDeserializer[T](schema)

  def toAvro(key: => Boolean, registry: String) = {
    val serializer = new KafkaAvroSerializer(new CachedSchemaRegistryClient(registry, 2))
    serializer.configure(configWithRegistry(registry), key)
    serializer
  }

  def fromAvro(key: => Boolean, registry: String) = {
    val deserializer = new io.confluent.kafka.serializers.KafkaAvroDeserializer(new CachedSchemaRegistryClient(registry, 2))

    deserializer
  }

  private def configWithRegistry(registry: String) = {
    Map(KafkaProperties.schemaRegistryProperty -> registry).asJava
  }

}
