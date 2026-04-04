package stella.common.kafka.config

final case class KafkaConsumerConfig(
    topicName: String,
    bootstrapServers: String,
    serializer: SerializerConfig,
    consumer: ConsumerConfig)
