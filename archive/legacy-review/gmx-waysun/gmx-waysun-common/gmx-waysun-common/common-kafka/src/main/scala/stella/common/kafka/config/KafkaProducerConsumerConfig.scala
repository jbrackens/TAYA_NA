package stella.common.kafka.config

final case class KafkaProducerConsumerConfig(
    topicName: String,
    bootstrapServers: String,
    serializer: SerializerConfig,
    producer: ProducerConfig,
    consumer: ConsumerConfig) {

  def toKafkaProducerConfig: KafkaProducerConfig =
    KafkaProducerConfig(topicName, bootstrapServers, serializer, producer)

  def toKafkaConsumerConfig: KafkaConsumerConfig =
    KafkaConsumerConfig(topicName, bootstrapServers, serializer, consumer)
}
