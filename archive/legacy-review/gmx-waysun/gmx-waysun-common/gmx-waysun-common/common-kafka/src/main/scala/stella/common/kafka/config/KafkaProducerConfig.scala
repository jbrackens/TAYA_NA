package stella.common.kafka.config

final case class KafkaProducerConfig(
    topicName: String,
    bootstrapServers: String,
    serializer: SerializerConfig,
    producer: ProducerConfig)
