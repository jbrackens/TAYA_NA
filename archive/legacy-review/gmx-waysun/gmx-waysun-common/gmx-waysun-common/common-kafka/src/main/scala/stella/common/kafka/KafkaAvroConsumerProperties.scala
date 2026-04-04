package stella.common.kafka

import java.util.Properties

import io.confluent.kafka.serializers.AbstractKafkaAvroSerDeConfig
import io.confluent.kafka.serializers.KafkaAvroDeserializer
import io.confluent.kafka.serializers.KafkaAvroDeserializerConfig
import org.apache.kafka.clients.consumer.ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.CLIENT_ID_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.GROUP_ID_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG
import org.apache.kafka.clients.consumer.ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG

import stella.common.kafka.config.ConsumerConfig
import stella.common.kafka.config.SerializerConfig

object KafkaAvroConsumerProperties {
  def fromConfig(
      bootstrapServers: String,
      consumerConfig: ConsumerConfig,
      serializerConfig: SerializerConfig): Properties = {
    import consumerConfig._
    import serializerConfig._

    val avroDeserializerClass = classOf[KafkaAvroDeserializer]
    new Properties {
      put(AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG, schemaRegistryUrl)
      put(BOOTSTRAP_SERVERS_CONFIG, bootstrapServers)
      put(CLIENT_ID_CONFIG, clientId)
      put(GROUP_ID_CONFIG, groupId)
      put(KEY_DESERIALIZER_CLASS_CONFIG, avroDeserializerClass.getName)
      put(VALUE_DESERIALIZER_CLASS_CONFIG, avroDeserializerClass.getName)
      put(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG, "true")
    }
  }
}
