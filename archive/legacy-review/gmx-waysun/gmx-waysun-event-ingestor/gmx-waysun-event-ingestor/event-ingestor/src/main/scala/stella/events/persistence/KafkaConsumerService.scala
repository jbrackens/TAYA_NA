package stella.events.persistence

import java.time.{Duration => JDuration}

import scala.jdk.CollectionConverters.BufferHasAsJava
import scala.jdk.CollectionConverters.IterableHasAsScala
import scala.jdk.CollectionConverters.ListHasAsScala
import scala.jdk.CollectionConverters.MapHasAsScala

import org.apache.kafka.clients.consumer.ConsumerRecords
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.common.TopicPartition

import stella.common.kafka.KafkaAvroConsumerProperties
import stella.common.kafka.config.KafkaConsumerConfig
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.EventKey

trait KafkaConsumerService {
  def pollLastStoredEventId(): Option[String]
}

class KafkaConsumerServiceImpl(kafkaConfig: KafkaConsumerConfig) extends KafkaConsumerService {
  override def pollLastStoredEventId(): Option[String] = {
    val properties =
      KafkaAvroConsumerProperties.fromConfig(kafkaConfig.bootstrapServers, kafkaConfig.consumer, kafkaConfig.serializer)
    val kafkaConsumer = new KafkaConsumer[EventKey, EventEnvelope](properties)
    try {
      val partitions = kafkaConsumer
        .partitionsFor(kafkaConfig.topicName)
        .asScala
        .map(p => new TopicPartition(p.topic(), p.partition()))
        .asJava
      kafkaConsumer.assign(partitions)
      val partitionOffsets = kafkaConsumer.endOffsets(partitions)
      partitionOffsets.asScala.foreach {
        case (partition, endOffset) if endOffset > 0 => kafkaConsumer.seek(partition, endOffset - 1)
        case _                                       => // skip
      }
      val consumerRecords: ConsumerRecords[EventKey, EventEnvelope] =
        kafkaConsumer.poll(JDuration.ofNanos(kafkaConfig.consumer.kafkaPollTimeout.toNanos))
      val records = consumerRecords.records(kafkaConfig.topicName).asScala
      if (records.isEmpty) None
      else Some(records.last.value().getMessageId.toString)
    } finally {
      kafkaConsumer.unsubscribe()
    }
  }
}
