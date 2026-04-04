package stella.common.kafka

import java.util.Properties

import io.confluent.kafka.serializers.AbstractKafkaAvroSerDeConfig
import io.confluent.kafka.serializers.KafkaAvroSerializer
import org.apache.kafka.clients.producer.ProducerConfig._

import stella.common.kafka.config.ProducerConfig
import stella.common.kafka.config.SerializerConfig

object KafkaAvroProducerProperties {
  def fromConfig(
      bootstrapServers: String,
      producerConfig: ProducerConfig,
      serializerConfig: SerializerConfig): Properties = {
    import producerConfig._
    import serializerConfig._

    val avroSerializerClass = classOf[KafkaAvroSerializer]
    new Properties {
      put(AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG, schemaRegistryUrl)
      put(ACKS_CONFIG, acks)
      put(BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
      put(CLIENT_ID_CONFIG, clientId)
      put(COMPRESSION_TYPE_CONFIG, compressionType)
      put(KEY_SERIALIZER_CLASS_CONFIG, avroSerializerClass)
      put(MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, maxInFlightRequestsPerConnection)
      maxNumberOfRetries.foreach(number => put(RETRIES_CONFIG, number))
      lingerMs.foreach(linger => put(LINGER_MS_CONFIG, linger))
      batchSize.foreach(batchSize => put(BATCH_SIZE_CONFIG, batchSize))
      put(VALUE_SERIALIZER_CLASS_CONFIG, avroSerializerClass)
    }
  }
}
