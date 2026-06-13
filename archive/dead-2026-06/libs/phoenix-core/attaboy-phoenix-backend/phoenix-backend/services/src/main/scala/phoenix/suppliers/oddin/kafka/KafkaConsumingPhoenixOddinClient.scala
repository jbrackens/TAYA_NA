package phoenix.suppliers.oddin.kafka

import akka.NotUsed
import akka.actor.typed.ActorSystem
import akka.actor.typed.scaladsl.adapter._
import akka.kafka.ConsumerSettings
import akka.kafka.Subscriptions
import akka.kafka.scaladsl.Consumer
import akka.stream.scaladsl.Source
import org.apache.kafka.clients.consumer.ConsumerConfig
import org.apache.kafka.clients.consumer.ConsumerRecord
import org.apache.kafka.common.serialization.StringDeserializer

import phoenix.suppliers.oddin.PhoenixOddinClient

/**
 * Helper API to simplify consumption of data published to Kafka by the Phoenix-Oddin runner.
 *
 * (e.g. in the Phoenix-Backend application we can simply call 'connectTo' with a known topic and
 * receive a 'Source' of data corresponding to the topic)
 *
 * Underneath, this uses an Alpakka Consumer. The combination of the basic Alpakka 'Consumer.plainSource'
 * and the setting to enable auto commit means that:
 * - Offsets are committed automatically by the underlying consumer
 * - Offsets are committed in batches
 * - This provides 'At Most Once' semantics, meaning that in the case of downstream failure the message
 *   will not be replayed as the batch of offsets might have already been committed.
 *
 * In addition, the current settings mean that when this client is first started, if there is no known
 * offset for this consumer group, the client will start to read from the earliest offset for the topic
 * (i.e. typically from the very beginning of the topic)
 */
class KafkaConsumingPhoenixOddinClient(consumerSettings: ConsumerSettings[String, String]) extends PhoenixOddinClient {
  override def connectTo[T](topic: Topic[T]): Source[T, NotUsed] = {
    val consumerRecordConverter = getConsumerRecordConverter(topic)
    Consumer
      .plainSource(consumerSettings, Subscriptions.topics(topic.name))
      .map(consumerRecordConverter)
      .mapMaterializedValue(_ => akka.NotUsed)
  }

  private def getConsumerRecordConverter[T](topic: Topic[T]): ConsumerRecord[String, String] => T =
    topic match {
      case Topic.OddinMarketOddsChangeEvents => throw new RuntimeException("Not implemented yet")
    }
}

object KafkaConsumingPhoenixOddinClient {
  def apply(system: ActorSystem[_], config: SimpleConsumerConfig): KafkaConsumingPhoenixOddinClient = {
    val classicSystem = system.toClassic
    val consumerSettings =
      ConsumerSettings(classicSystem, new StringDeserializer, new StringDeserializer)
        .withBootstrapServers(config.bootstrapServers)
        .withGroupId(config.groupId)
        .withProperty(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest")
        .withProperty(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, "true")
    new KafkaConsumingPhoenixOddinClient(consumerSettings)
  }
}
