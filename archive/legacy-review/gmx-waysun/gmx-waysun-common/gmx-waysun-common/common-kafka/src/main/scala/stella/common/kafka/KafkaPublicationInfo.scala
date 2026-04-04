package stella.common.kafka

import org.apache.kafka.clients.producer.RecordMetadata

final case class KafkaPublicationInfo(topic: String, partition: Int, offset: Long, timestamp: Long)

object KafkaPublicationInfo {

  def fromRecordMetadata(metadata: RecordMetadata): KafkaPublicationInfo =
    KafkaPublicationInfo(metadata.topic(), metadata.partition(), metadata.offset(), metadata.timestamp())
}
