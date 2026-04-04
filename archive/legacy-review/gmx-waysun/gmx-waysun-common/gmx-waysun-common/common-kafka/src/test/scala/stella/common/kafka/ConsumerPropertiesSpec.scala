package stella.common.kafka

import scala.concurrent.duration.DurationInt

import io.confluent.kafka.serializers.AbstractKafkaAvroSerDeConfig
import io.confluent.kafka.serializers.KafkaAvroDeserializer
import io.confluent.kafka.serializers.KafkaAvroDeserializerConfig
import org.apache.kafka.clients.consumer.ConsumerConfig._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

import stella.common.kafka.config.ConsumerConfig
import stella.common.kafka.config.SerializerConfig

class ConsumerPropertiesSpec extends AnyFlatSpec with should.Matchers {

  "fromConfig" should "properly map config to properties" in {
    val bootstrapServers = "testBootstrapServersUrl"
    val consumerConfig = ConsumerConfig(clientId = "testClientId", groupId = "group1", kafkaPollTimeout = 5.seconds)
    val serializerConfig = SerializerConfig(schemaRegistryUrl = "testSchemaRegistryUrl")
    val props = KafkaAvroConsumerProperties.fromConfig(bootstrapServers, consumerConfig, serializerConfig)

    val avroDeserializerClass = classOf[KafkaAvroDeserializer]
    props.get(AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG) shouldBe serializerConfig.schemaRegistryUrl
    props.get(BOOTSTRAP_SERVERS_CONFIG) shouldBe bootstrapServers
    props.get(CLIENT_ID_CONFIG) shouldBe consumerConfig.clientId
    props.get(GROUP_ID_CONFIG) shouldBe consumerConfig.groupId
    props.get(KEY_DESERIALIZER_CLASS_CONFIG) shouldBe avroDeserializerClass.getName
    props.get(VALUE_DESERIALIZER_CLASS_CONFIG) shouldBe avroDeserializerClass.getName
    props.get(KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG) shouldBe "true"
  }
}
