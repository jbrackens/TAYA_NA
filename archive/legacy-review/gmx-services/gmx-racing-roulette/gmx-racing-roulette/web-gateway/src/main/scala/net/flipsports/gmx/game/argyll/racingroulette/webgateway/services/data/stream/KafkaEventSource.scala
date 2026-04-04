package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream

import java.util.UUID

import akka.actor.ActorSystem
import akka.event.{Logging, LoggingAdapter}
import akka.kafka.scaladsl.Consumer
import akka.kafka.{ConsumerSettings, Subscriptions}
import akka.stream.scaladsl.Source
import com.typesafe.config.Config
import io.confluent.kafka.serializers.{AbstractKafkaAvroSerDeConfig, KafkaAvroDeserializer, KafkaAvroDeserializerConfig}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.StateUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.mapper.PayloadMapper
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.serializer.EventDeserializer
import net.flipsports.gmx.racingroulette.api.Event
import org.apache.avro.specific.SpecificRecord
import org.apache.kafka.clients.consumer.{ConsumerConfig, ConsumerRecord}
import org.apache.kafka.common.serialization._

import scala.collection.JavaConverters._
import scala.util.{Failure, Success, Try}

class KafkaEventSource(implicit val config: Config, val system: ActorSystem) extends EventSource {

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)

  private val kafkaConsumerConfig = config.getConfig("akka.kafka.consumer")

  private val eventUpdatesConfig = config.getConfig("app.event-updates.kafka-source")

  private val topic = eventUpdatesConfig.getString("horse-racing-events")

  private val bootstrap = eventUpdatesConfig.getString("bootstrap-servers")
  private val schemaRegistry = eventUpdatesConfig.getString("schema-registry")

  private val kafkaAvroSerDeConfig: Map[String, Any] = Map[String, Any](
    AbstractKafkaAvroSerDeConfig.SCHEMA_REGISTRY_URL_CONFIG -> schemaRegistry,
    KafkaAvroDeserializerConfig.SPECIFIC_AVRO_READER_CONFIG -> true.toString
  )

  private val kafkaAvroDeserializer: Deserializer[SpecificRecord] = {
    val kafkaAvroDeserializer = new KafkaAvroDeserializer()
    kafkaAvroDeserializer.configure(kafkaAvroSerDeConfig.asJava, false)
    kafkaAvroDeserializer.asInstanceOf[Deserializer[SpecificRecord]]
  }

  private val binaryEventDeserializer = EventDeserializer(topic, kafkaAvroDeserializer)

  private val payloadMapper = new PayloadMapper()

  private val consumerSettings = ConsumerSettings(
    config = kafkaConsumerConfig,
    keyDeserializer = Some(new ByteArrayDeserializer),
    valueDeserializer = Some(new ByteArrayDeserializer))
    .withBootstrapServers(bootstrap)
    .withGroupId(s"horse-racing-events-${UUID.randomUUID().toString}")
    .withProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")


  val control: Source[StateUpdate, Any] =
    Consumer
      .plainSource(consumerSettings, Subscriptions.topics(topic))
      .filter(notNullValue)
      .map(item => binaryEventDeserializer.read(item.value()))
      .map(item => (item, Try(convertPayload(item))))
      .filter(parsed => validRecord(parsed._1, parsed._2))
      .map(_._2.get)
      .log("oddsUpdateSource")

  private def notNullValue(record: ConsumerRecord[Array[Byte], Array[Byte]]): Boolean = {
    record.value() != null && !record.value().isEmpty
  }

  private def convertPayload(item: Event): StateUpdate  = payloadMapper.map(item.getPayload)

  private def validRecord(source: Event, parsedRecord: Try[StateUpdate]): Boolean = {
    parsedRecord match {
      case Success(_) => true
      case Failure(resp) =>
        logger.error(resp, s"Could not parse record from Kafka: $source")
        false
    }
  }

  override def provide: Source[StateUpdate, Any] = control
}
