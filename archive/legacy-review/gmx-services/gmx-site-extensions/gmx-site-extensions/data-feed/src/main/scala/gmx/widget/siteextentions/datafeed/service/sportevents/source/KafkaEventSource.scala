package gmx.widget.siteextentions.datafeed.service.sportevents.source

import scala.collection.JavaConverters._

import akka.actor.typed.ActorSystem
import akka.event.Logging
import akka.event.LoggingAdapter
import akka.kafka.ConsumerSettings
import akka.kafka.Subscriptions
import akka.kafka.scaladsl.Consumer
import akka.kafka.scaladsl.Consumer.Control
import akka.stream.scaladsl.Source
import io.confluent.kafka.serializers.AbstractKafkaAvroSerDeConfig
import io.confluent.kafka.serializers.KafkaAvroDeserializer
import io.confluent.kafka.serializers.KafkaAvroDeserializerConfig
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization._

import gmx.widget.siteextentions.datafeed.service.sportevents.SportEventsConfig
import gmx.widget.siteextentions.datafeed.service.sportevents.source.EventSource.AvroEventRecord

class KafkaEventSource(implicit sportEventsConfig: SportEventsConfig, system: ActorSystem[_])
    extends EventSource[Control] {

  implicit val logger: LoggingAdapter = Logging(system.classicSystem, this.getClass)

  private val topic = sportEventsConfig.kafkaSource.topic
  private val groupId = sportEventsConfig.kafkaSource.groupId
  private val schemaRegistry = sportEventsConfig.kafkaSource.schemaRegistry
  private val kafkaConsumerConfig = sportEventsConfig.kafkaSource.consumerConfig

  private val kafkaAvroSerDeConfig: Map[String, Any] = Map[String, Any](
    AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG -> schemaRegistry,
    KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG -> true.toString)

  private val kafkaAvroKeyDeserializer: Deserializer[SpecificRecord] = {
    val kafkaAvroDeserializer = new KafkaAvroDeserializer()
    kafkaAvroDeserializer.configure(kafkaAvroSerDeConfig.asJava, true)
    kafkaAvroDeserializer.asInstanceOf[Deserializer[SpecificRecord]]
  }

  private val kafkaAvroValueDeserializer: Deserializer[SpecificRecord] = {
    val kafkaAvroDeserializer = new KafkaAvroDeserializer()
    kafkaAvroDeserializer.configure(kafkaAvroSerDeConfig.asJava, false)
    kafkaAvroDeserializer.asInstanceOf[Deserializer[SpecificRecord]]
  }

  private val binaryEventDeserializer = EventDeserializer(topic, kafkaAvroKeyDeserializer, kafkaAvroValueDeserializer)

  private val consumerSettings = ConsumerSettings(
    config = kafkaConsumerConfig,
    keyDeserializer = Some(new ByteArrayDeserializer),
    valueDeserializer = Some(new ByteArrayDeserializer)).withGroupId(groupId)

  lazy val provide: Source[(DataRecord, AvroEventRecord), Control] =
    Consumer
      .plainPartitionedSource(consumerSettings, Subscriptions.topics(topic))
      .flatMapMerge(6, _._2)
      .map(item => readDataRecord(item) -> item)
      .log("userBetsSource")

  // TODO temporarily
  def readDataRecord(item: ConsumerRecord[Array[Byte], Array[Byte]]) = binaryEventDeserializer.read(item)
}
