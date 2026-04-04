package gmx.common.internal.scala.lagom.serializer

import akka.util.ByteString
import io.confluent.kafka.serializers.{
  AbstractKafkaAvroSerDeConfig,
  KafkaAvroDeserializer,
  KafkaAvroDeserializerConfig,
  KafkaAvroSerializer
}
import org.apache.avro.generic.GenericRecord
import org.apache.avro.specific.SpecificRecordBase

/**
 * A Lagom MessageSerializer that can communicate with an instance of Confluent's
 * Schema Registry to establish a unique Id for the schema for the messages being
 * serialized/deserialized.
 *
 * The Schema Registry allows us to write an ID into and read an ID from the messages
 * rather than having to embed the whole schema into every message (schema are often
 * larger than the messages themselves).
 *
 * @param schemaRegistryUrl url of the Confluent Schema Registry this MessageSerializer will communicate with.
 * @tparam T The type of Avro message we're dealing with
 */
class AvroSchemaRegistryMessageSerializer[T <: SpecificRecordBase](schemaRegistryUrl: String) extends AvroSpecificMessageSerializer[T] {

  override val serializer = (message: T) => {
    val output = kafkaSerializer.serialize(null, message)
    akka.util.ByteString(output)
  }

  //FIXME if any subscriber is about to use the Lagom-based client for service it will fail | https://flipsports.atlassian.net/browse/GMV3-331
  override val deserializer = (bytes: ByteString) => {
    val record = kafkaDeserializer
      .deserialize(null, bytes.toArray)
      .asInstanceOf[GenericRecord]
    throw new RuntimeException("something")
  }

  private val kafkaSerializer = {
    val s       = new KafkaAvroSerializer()
    val configs = new java.util.HashMap[String, Any]()
    configs.put(
      AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG,
      schemaRegistryUrl
    )
    s.configure(configs, false)
    s
  }

  private val kafkaDeserializer = {
    val s       = new KafkaAvroDeserializer()
    val configs = new java.util.HashMap[String, Any]()
    configs.put(
      AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG,
      schemaRegistryUrl
    )
    configs.put(
      KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG,
      "false"
    )
    s.configure(configs, false)
    s
  }

}
