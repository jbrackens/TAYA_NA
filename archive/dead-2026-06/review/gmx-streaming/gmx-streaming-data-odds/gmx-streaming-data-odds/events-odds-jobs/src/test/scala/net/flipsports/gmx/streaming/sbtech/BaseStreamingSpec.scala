package net.flipsports.gmx.streaming.sbtech

import com.dimafeng.testcontainers.{Container, ForEachTestContainer}
import gmx.dataapi.internal.siteextensions.{SportEventUpdate, SportEventUpdateKey}
import net.flipsports.gmx.streaming.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.{EventsDataProvider, MarketsDataProvider, SelectionsDataProvider}
import net.flipsports.gmx.streaming.sbtech.configs.{AppConfig, ConfigurationLoader, Features, TopicNames}
import net.flipsports.gmx.streaming.sbtech.streams.OddsStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes

import scala.reflect.io.File

abstract class BaseStreamingSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForEachTestContainer
  with SchemaRegistryOperations {

  type Events = (SourceTypes.Event.KeyType,SourceTypes.Event.ValueType)
  type Markets = (SourceTypes.Market.KeyType,SourceTypes.Market.ValueType)
  type Selections = (SourceTypes.Selection.KeyType,SourceTypes.Selection.ValueType)

  val events = EventsDataProvider.allAsScala()
  val markets = MarketsDataProvider.allAsScala()
  val selections = SelectionsDataProvider.allAsScala()
  val checkpoints = s"file://${File(".").toAbsolute.path}/target"
  val globalMetaParameters = MetaParameters("", Some(checkpoints))
  val globalBusinessParameters = new SportNationMetaParameters {}


  override def container: Container = kafkaWithSchemaRegistryContainers

  def withEnvironment(test: (AppConfig, KafkaProperties, String) => Unit): Unit = {
    withFlink (new InternalFlinkMiniClusterRunner) { _ =>
      withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>
        val config = ConfigurationLoader.apply
        val localConfig = config.copy(
          kafka = kafkaProperties.withOffsetResetConfig("earliest"),
          sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
          targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
        )
        test(localConfig, kafkaProperties, schemaRegistryConnectionUrl)
      }
    }
  }

  def withEvents(items: Seq[Events], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties): Unit = {
    import sbtech.sportsData.contracts.avro.{event, eventId}
    withSchemaValueOnSubject(schemaRegistryUrl, topic, event.SCHEMA$.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, eventId.SCHEMA$.toString)
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .produceBinary(items, SerDes.toAvro(key = true, schemaRegistryUrl), SerDes.toAvro(key = false, schemaRegistryUrl))
  }

  def withMarkets(items: Seq[Markets], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties): Unit = {
    import sbtech.sportsData.contracts.avro.{market, marketId}
    withSchemaValueOnSubject(schemaRegistryUrl, topic, market.SCHEMA$.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, marketId.SCHEMA$.toString)
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .produceBinary(items, SerDes.toAvro(key = true, schemaRegistryUrl), SerDes.toAvro(key = false, schemaRegistryUrl))
  }
  def withSelections(items: Seq[Selections], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties): Unit = {
    import sbtech.sportsData.contracts.avro.{selection, selectionId}
    withSchemaValueOnSubject(schemaRegistryUrl, topic, selection.SCHEMA$.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, selectionId.SCHEMA$.toString)
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .produceBinary(items, SerDes.toAvro(key = true, schemaRegistryUrl), SerDes.toAvro(key = false, schemaRegistryUrl))
  }

  def withResult(targetTopic: String, schemaRegistryUrl: String): Unit = {
    withSchemaKeyOnSubject(schemaRegistryUrl, targetTopic, SportEventUpdateKey.SCHEMA$.toString)
    withSchemaValueOnSubject(schemaRegistryUrl, targetTopic, SportEventUpdate.SCHEMA$.toString)
  }

  def getResult(kafkaProperties: KafkaProperties, topic: String, schemaRegistryUrl: String) = {
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .consumeAvro[SportEventsTypes.SportEventUpdate.KeyType, SportEventsTypes.SportEventUpdate.ValueType](1)(SportEventUpdateKey.SCHEMA$, SportEventUpdate.SCHEMA$)
  }

  def withFeatures(applicationConfig: AppConfig, dummyFeatures: Features): AppConfig = {
    applicationConfig.copy(features = dummyFeatures)
  }

  def withOddsStream(appConfig: AppConfig, kafkaProperties: KafkaProperties, schemaRegistryUrl: String)(data: () => Unit, assertion: Seq[(SportEventsTypes.SportEventUpdate.KeyType, SportEventsTypes.SportEventUpdate.ValueType)] => Unit) = {
    data()
    val events = TopicNames.Target.odds(appConfig, globalBusinessParameters)
    val job = new OddsStream(metaParameters = globalMetaParameters, businessMetaParameters = globalBusinessParameters, configuration = appConfig) {
      override def failIfAnyDummyEnabled(): Unit = {
        /*should not fail*/
      }
    }
    withResult(events, schemaRegistryUrl)
    runAsyncJob(job.stream())
    val result = getResult(kafkaProperties, events, schemaRegistryUrl)
    assertion(result)
  }

}