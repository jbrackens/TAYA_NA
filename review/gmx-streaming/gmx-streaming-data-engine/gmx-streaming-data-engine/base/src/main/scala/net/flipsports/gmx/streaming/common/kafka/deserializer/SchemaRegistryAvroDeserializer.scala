package net.flipsports.gmx.streaming.common.kafka.deserializer

import io.confluent.kafka.serializers.KafkaAvroDeserializer
import net.flipsports.gmx.streaming.common.kafka.SchemaRegistryClientBuilder
import org.apache.avro.generic.GenericRecord
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.common.serialization.Deserializer
import scala.collection.JavaConverters._

object SchemaRegistryAvroDeserializer extends Serializable {

  def deserializer(schemaRegistryUrl: String, isKey: Boolean): Deserializer[GenericRecord] = {
    val deserializer = new KafkaAvroDeserializer(SchemaRegistryClientBuilder(schemaRegistryUrl))
    deserializer.configure(Map("schema.registry.url" -> schemaRegistryUrl).asJava, isKey)
    deserializer.asInstanceOf[Deserializer[GenericRecord]]
  }

  def deserializer[V <: SpecificRecord](schemaRegistryUrl: String, clazz: Class[V], isKey: Boolean): Deserializer[V] = {
    val deserializer = new SpecificRecordKafkaAvroDeserializer(clazz, SchemaRegistryClientBuilder(schemaRegistryUrl))
    deserializer.configure(Map("schema.registry.url" -> schemaRegistryUrl).asJava, isKey)
    deserializer.asInstanceOf[Deserializer[V]]
  }
}
