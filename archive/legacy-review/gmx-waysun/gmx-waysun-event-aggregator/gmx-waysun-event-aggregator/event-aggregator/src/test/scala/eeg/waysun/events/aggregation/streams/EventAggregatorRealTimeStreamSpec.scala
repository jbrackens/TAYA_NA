package eeg.waysun.events.aggregation.streams

import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import eeg.waysun.events.aggregation.InternalFlinkMiniClusterRunner
import eeg.waysun.events.aggregation.configs.AppConfigDef.ConfigurationLoader
import eeg.waysun.events.aggregation.data.{AggregationDefinitionConfigurationProvider, ValidatedEventProvider}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import stella.dataapi.aggregation.{AggregationRuleConfiguration, AggregationRuleConfigurationKey}

import scala.reflect.io.File

class EventAggregatorRealTimeStreamSpec
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
          val job = new EventAggregatorStream(
            Array(),
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          val companyId = "sample-company"

          withSchemaKeyOnSubject(
            schemaRegistryConnectionUrl,
            job.sources.aggregationDefinitionTopic,
            AggregationRuleConfigurationKey.SCHEMA$.toString)
          withSchemaValueOnSubject(
            schemaRegistryConnectionUrl,
            job.sources.aggregationDefinitionTopic,
            AggregationRuleConfiguration.SCHEMA$.toString)
          KafkaIO(localConfig.kafka, job.sources.aggregationDefinitionTopic, schemaRegistryConnectionUrl).produceBinary(
            AggregationDefinitionConfigurationProvider().all(2, companyId),
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          // source topic
          import stella.dataapi.platformevents.{EventEnvelope, EventKey}
          withSchemaKeyOnSubject(
            schemaRegistryConnectionUrl,
            job.sources.eventValidatedTopic,
            EventKey.SCHEMA$.toString)
          withSchemaValueOnSubject(
            schemaRegistryConnectionUrl,
            job.sources.eventValidatedTopic,
            EventEnvelope.SCHEMA$.toString)
          KafkaIO(localConfig.kafka, job.sources.eventValidatedTopic, schemaRegistryConnectionUrl).produceBinary(
            ValidatedEventProvider.all(2, companyId),
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          KafkaIO(localConfig.kafka, job.sources.eventValidatedTopic, schemaRegistryConnectionUrl).produceBinary(
            ValidatedEventProvider.all(2, companyId),
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          job.stream()

        }
      }
    }
  }

}
