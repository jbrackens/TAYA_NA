package net.flipsports.gmx.streaming.sbtech.streams

import com.typesafe.scalalogging.LazyLogging
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.sbtech.SportEventsTypes.SportEventUpdate
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.sbtech.dto.SourceStreams
import net.flipsports.gmx.streaming.sbtech.streams.builders.{EventStreamBuilder, MarketStreamBuilder, SelectionStreamBuilder}
import net.flipsports.gmx.streaming.sbtech.streams.joiner.SiteExtensionsMultiStreamJoiner
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

import java.util.UUID

class OddsStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: AppConfig)
  extends CustomStream(metaParameters, businessMetaParameters) with LazyLogging {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.processing-events-on-${businessMetaParameters.brand().sourceBrand.name}")

  val targetTopic: String = s"${TopicNames.Target.odds(configuration, businessMetaParameters)}"

  @transient
  val uuid = UUID.randomUUID().toString

  def buildSink =
    KafkaSink(targetTopic, kafkaProperties.withApplicationId(AppConfig.applicationId(s"result-$uuid", businessMetaParameters)), configuration.targetTopics.schemaRegistry)
      .keyAndValue(SportEventUpdate.KeyClass, SportEventUpdate.ValueClass)


  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {
    failIfAnyDummyEnabled()
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)

    val eventsStream = buildEventsStream().build(env, kafkaProperties)
    val marketsStream = buildMarketsStream().build(env, kafkaProperties)
    val selectionsStream = buildSelectionsStream().build(env, kafkaProperties)

    val sourceStreams: SourceStreams = SourceStreams(events = eventsStream, markets = marketsStream, selections = selectionsStream)
   buildMultiStreamJoiner().join(env, sourceStreams, buildSink)
  }

  def buildEventsStream(): EventStreamBuilder = EventStreamBuilder(businessMetaParameters, configuration)

  def buildMarketsStream(): MarketStreamBuilder = MarketStreamBuilder(businessMetaParameters, configuration)

  def buildSelectionsStream(): SelectionStreamBuilder = SelectionStreamBuilder(businessMetaParameters, configuration)

  def buildMultiStreamJoiner(): SiteExtensionsMultiStreamJoiner = SiteExtensionsMultiStreamJoiner(businessMetaParameters, configuration.features)

  // method should be used in tests
  @VisibleForTesting
  def failIfAnyDummyEnabled() = {
    val features = configuration.features
    if (features.dummy) {
      throw new RuntimeException("If there is any dummy flow enabled it should not ")
    }
  }
}

object OddsStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: AppConfig): Unit =
    new OddsStream(metaParameters, businessMetaParameters, configuration).stream()

}