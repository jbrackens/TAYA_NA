package stella.common.kafka

import scala.concurrent.duration.DurationInt

import io.confluent.kafka.serializers.AbstractKafkaAvroSerDeConfig
import io.confluent.kafka.serializers.KafkaAvroSerializer
import org.apache.kafka.clients.producer.ProducerConfig._
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should

import stella.common.kafka.config.ProducerConfig
import stella.common.kafka.config.SerializerConfig

class ProducerPropertiesSpec extends AnyFlatSpec with should.Matchers {

  "fromConfig" should "properly map config to properties" in {
    val bootstrapServers = "testBootstrapServersUrl"
    val producerConfig = ProducerConfig(
      acks = "testAcks",
      clientId = "testClientId",
      compressionType = "testCompressionType",
      maxInFlightRequestsPerConnection = 1000,
      maxNumberOfRetries = Some(1),
      publicationTimeLimit = Some(1.second),
      lingerMs = Some(1),
      batchSize = Some(1))
    val serializerConfig = SerializerConfig(schemaRegistryUrl = "testSchemaRegistryUrl")
    val props = KafkaAvroProducerProperties.fromConfig(bootstrapServers, producerConfig, serializerConfig)

    val avroSerializerClass = classOf[KafkaAvroSerializer]
    props.get(AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG) shouldBe serializerConfig.schemaRegistryUrl
    props.get(ACKS_CONFIG) shouldBe producerConfig.acks
    props.get(BOOTSTRAP_SERVERS_CONFIG) shouldBe bootstrapServers
    props.get(CLIENT_ID_CONFIG) shouldBe producerConfig.clientId
    props.get(COMPRESSION_TYPE_CONFIG) shouldBe producerConfig.compressionType
    props.get(KEY_SERIALIZER_CLASS_CONFIG) shouldBe avroSerializerClass
    props.get(MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION) shouldBe producerConfig.maxInFlightRequestsPerConnection
    Option(props.get(RETRIES_CONFIG)) shouldBe producerConfig.maxNumberOfRetries
    Option(props.get(LINGER_MS_CONFIG)) shouldBe producerConfig.lingerMs
    Option(props.get(BATCH_SIZE_CONFIG)) shouldBe producerConfig.batchSize
    props.get(VALUE_SERIALIZER_CLASS_CONFIG) shouldBe avroSerializerClass
  }
}
