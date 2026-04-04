package eeg.waysun.events.achievements.streams

import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import stella.dataapi.achievement.event.{AchievementEvent, AchievementEventKey}
import stella.dataapi.achievement.{AchievementConfiguration, AchievementConfigurationKey}
import stella.dataapi.aggregation.{AggregationResult, AggregationResultKey}
import eeg.waysun.events.achievements.InternalFlinkMiniClusterRunner
import eeg.waysun.events.achievements.configs.AppConfigDef.ConfigurationLoader
import eeg.waysun.events.achievements.data.{DefinitionDataProvider, RawDataProvider}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes

import scala.reflect.io.File

class AchievementEventRealTimeStreamSpec
    extends StreamingTestBase
    with FlinkJobsTestRunner
    with ConfluentPlatformContainers
    with ForAllTestContainer
    with SchemaRegistryOperations {

  override def container: Container = kafkaWithSchemaRegistryContainers

  /**
   * Due to implementation this test will stay here just for debugging locally data.
   */
  "Raw events" ignore {
    val projectId = "small-gaming-company"
    val aggregatedData = RawDataProvider.all(10, projectId)
    val definitionData = DefinitionDataProvider.all(10, projectId)

    "publish messages and process in streaming topology" in {
      withFlink(new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>
          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl))

          val checkpoints = s"file://${File(".").toAbsolute.path}/target"

          val params = BusinessMetaParameters.waysun
          val job = new EventAchievementStream(
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          // source topics
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.aggregateTopic, AggregationResultKey.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.aggregateTopic, AggregationResult.SCHEMA$.toString)

          KafkaIO(localConfig.kafka, job.aggregateTopic, schemaRegistryConnectionUrl).produceBinary(
            aggregatedData,
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          withSchemaKeyOnSubject(
            schemaRegistryConnectionUrl,
            job.achievementDefinitionTopic,
            AchievementConfigurationKey.SCHEMA$.toString)
          withSchemaValueOnSubject(
            schemaRegistryConnectionUrl,
            job.achievementDefinitionTopic,
            AchievementConfiguration.SCHEMA$.toString)

          KafkaIO(localConfig.kafka, job.achievementDefinitionTopic, schemaRegistryConnectionUrl).produceBinary(
            definitionData,
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          // result topic
          withSchemaKeyOnSubject(
            schemaRegistryConnectionUrl,
            job.achievementTopic,
            AchievementEventKey.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.achievementTopic, AchievementEvent.SCHEMA$.toString)

          job.stream()

          val records = KafkaIO(localConfig.kafka, job.achievementTopic, schemaRegistryConnectionUrl)
            .consumeAvro[AchievementEventKey, AchievementEvent](1)(
              AchievementEventKey.SCHEMA$,
              AchievementEvent.SCHEMA$)

          records.size shouldEqual aggregatedData.size // hwatever as for now

        }
      }
    }
  }

}
