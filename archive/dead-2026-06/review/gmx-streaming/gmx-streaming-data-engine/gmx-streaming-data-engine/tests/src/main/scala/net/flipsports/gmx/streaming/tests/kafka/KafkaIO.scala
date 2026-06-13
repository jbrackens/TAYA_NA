package net.flipsports.gmx.streaming.tests.kafka

import java.time.{Duration, Instant}
import java.util.UUID

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.avro.Schema
import org.apache.avro.generic.GenericRecord
import org.apache.avro.specific.SpecificData
import org.apache.kafka.clients.consumer.KafkaConsumer
import org.apache.kafka.clients.producer.{KafkaProducer, ProducerRecord, RecordMetadata}
import org.apache.kafka.common.TopicPartition
import org.apache.kafka.common.serialization.{Deserializer, Serializer}

import scala.annotation.tailrec
import scala.collection.JavaConverters._


class KafkaIO(val kafkaProperties: KafkaProperties, topic: String, schemaRegistryUrl: Option[String]) extends LazyLogging {

  private val maxIterationNumber = 1000

  def produceBinary[K, V](records: Seq[(K, V)], keySerializer: Serializer[K], valueSerializer: Serializer[V]): Seq[RecordMetadata] = {
    val producer = new KafkaProducer[K, V](enhanceProperties(), keySerializer, valueSerializer)
    records.map { item =>
      logger.info(s"Producing test flow record with key : ${item._1} and value: ${item._2}")
      producer.send(new ProducerRecord[K, V](topic,null, Instant.now().getEpochSecond, item._1, item._2)).get()
    }
  }
  def produceAvro[V](records: Seq[V], valueSerializer: Serializer[V]): Seq[RecordMetadata] = {
    val producer = new KafkaProducer[String, V](enhanceProperties(), SerDes.toStringSerDes, valueSerializer)
    records.map { item =>
      logger.info(s"Producing test flow record with value: $item")
      producer.send(new ProducerRecord[String, V](topic, null, Instant.now().getEpochSecond, null, item)).get()
    }
  }

  def consumeBinary[K, V](numberOfRecords: Int, maxIterations: Int = maxIterationNumber)(keyDeserializer: Deserializer[K], valueDeserializer: Deserializer[V]): Seq[(K, V)] = {
    val consumer: KafkaConsumer[K, V] = new KafkaConsumer(kafkaProperties.properties, keyDeserializer, valueDeserializer)
    consumer.subscribe(Seq(topic).asJava)
    fetchMessages(consumer, maxIterations)
  }

  def consumeAvro[K, V](numberOfRecords: Int, maxIterations: Int = maxIterationNumber)(keySchema: Schema, valueSchema: Schema): Seq[(K, V)] = {
    val consumerProperties = kafkaProperties
      .withGroupId(UUID.randomUUID().toString)
      .withRegistry(schemaRegistryUrl.get).properties
    val consumer = new KafkaConsumer(consumerProperties, SerDes.fromAvro( key = true, schemaRegistryUrl.get), SerDes.fromAvro(key = false, schemaRegistryUrl.get))
    consumer.subscribe(Seq(topic).asJava)
    fetchMessages(consumer, maxIterations).map {
        case (key: GenericRecord, value: GenericRecord) => Tuple2(SpecificData.get().deepCopy(keySchema, key).asInstanceOf[K], SpecificData.get().deepCopy(valueSchema, value).asInstanceOf[V])
        case (key: GenericRecord, null) => Tuple2(SpecificData.get().deepCopy(keySchema, key).asInstanceOf[K], null.asInstanceOf[V])//allowing consuming null value for ex. compact topic clearing
        case (null, value: GenericRecord) => Tuple2(null.asInstanceOf[K], SpecificData.get().deepCopy(valueSchema, value).asInstanceOf[V])//allowing consuming null key for ex. compact topic clearing
        case (_, _) => throw new RuntimeException("Consumer should return only GenericRecord type. Debug your case.")
      }
  }

  private def enhanceProperties() = schemaRegistryUrl match {
    case Some(url) => kafkaProperties.withRegistry(url).properties
    case None => kafkaProperties.properties
  }

  private def fetchMessages[K, V] (consumer: KafkaConsumer[K, V], maxIterations: Int): Seq[(K, V)] = {

    @tailrec
    def performIteration(iteration: Int, accumulator: Seq[(K, V)]): Seq[(K, V)] = {
      val consumed = consumer.poll(Duration.ofSeconds(5))
      consumer.commitSync()
      val collected = consumed.records(topic).asScala.map(item => (item.key(), item.value()))
      val result = accumulator ++ collected
      if (!shouldProcceedFetching(consumer, iteration)) result else performIteration(iteration + 1, result )
    }
    performIteration(0, Seq())
  }

  private def shouldProcceedFetching[K, V](consumer: KafkaConsumer[K, V], execution: Int) =
    endOffset(consumer) != consumerPosition(consumer)  &&  maxIterationNotPerformed(execution)

  private def defaultPartition(partitionIdx: Int = 0) = new TopicPartition(topic, partitionIdx)

  private def endOffset[K, V](consumer: KafkaConsumer[K, V], partition: TopicPartition = defaultPartition()) =
    consumer.endOffsets(Seq(partition).asJava).get(partition)

  private def consumerPosition[K, V](consumer: KafkaConsumer[K, V], partition: TopicPartition = defaultPartition()) =
    consumer.position(partition)

  private def maxIterationNotPerformed(executions: Int, maxIterations: Int = maxIterationNumber) = executions < maxIterations

}



object KafkaIO {

  def apply(topic: String) = new KafkaIO(KafkaProperties(), topic, None)

  def apply(kafkaProperties: KafkaProperties, topic: String) = new KafkaIO(kafkaProperties, topic, None)

  def apply(kafkaProperties: KafkaProperties, topic: String, schemaRegistryUrl: String) = new KafkaIO(kafkaProperties, topic, Some(schemaRegistryUrl))
}
