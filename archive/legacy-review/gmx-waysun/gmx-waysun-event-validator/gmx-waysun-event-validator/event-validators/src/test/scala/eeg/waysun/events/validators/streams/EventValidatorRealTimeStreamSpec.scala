package eeg.waysun.events.validators.streams

import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import stella.dataapi.platformevents.FailedEventEnvelope
import eeg.waysun.events.validators.InternalFlinkMiniClusterRunner
import eeg.waysun.events.validators.configs.AppConfigDef.ConfigurationLoader
import eeg.waysun.events.validators.data.{DefinitionDataProvider, RawDataProvider}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, WaysunMetaParameters}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.scalactic.source.Position
import org.scalatest.time.{Minutes, Span}

import java.util.UUID
import scala.reflect.io.File

class EventValidatorRealTimeStreamSpec
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
    val projectId = "small-gaming-project"
    val rawData = RawDataProvider.all(10, projectId)
    val definitionData = DefinitionDataProvider.all(10, projectId)
    val definitionWithNull = definitionData :+ Tuple2(definitionData.head._1, null)

    "publish messages and process in streaming topology" in {
      withFlink(new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>
          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl))

          val checkpoints = s"file://${File(".").toAbsolute.path}/target"

          val params = new WaysunMetaParameters {}
          val job = new EventValidatorStream(
            Array(),
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          // source topic
          import stella.dataapi.eventconfigurations.{EventConfiguration, EventConfigurationKey}
          withSchemaKeyOnSubject(
            schemaRegistryConnectionUrl,
            job.definitionTopic,
            EventConfigurationKey.SCHEMA$.toString)
          withSchemaValueOnSubject(
            schemaRegistryConnectionUrl,
            job.definitionTopic,
            EventConfiguration.SCHEMA$.toString)
          import stella.dataapi.platformevents.{EventEnvelope, EventKey, ValidatedEventEnvelope}
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.rawTopic, EventKey.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.rawTopic, EventEnvelope.SCHEMA$.toString)

          KafkaIO(localConfig.kafka, job.definitionTopic, schemaRegistryConnectionUrl).produceBinary(
            definitionWithNull,
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          // validated topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.validated, EventKey.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.validated, ValidatedEventEnvelope.SCHEMA$.toString)

          // failed topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.failed, EventKey.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.failed, FailedEventEnvelope.SCHEMA$.toString)

          KafkaIO(localConfig.kafka, job.rawTopic, schemaRegistryConnectionUrl).produceBinary(
            rawData,
            SerDes.toAvro(key = true, schemaRegistryConnectionUrl),
            SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          runAsyncJob(job.stream())

          eventually {
            val properties = localConfig.kafka.withGroupId(UUID.randomUUID().toString)
            val records = KafkaIO(properties, job.validated, schemaRegistryConnectionUrl)
              .consumeAvro[EventKey, EventEnvelope](10)(EventKey.SCHEMA$, EventEnvelope.SCHEMA$)

            records should have size 10
          }(PatienceConfig(timeout = Span(5, Minutes), interval = Span(2, Minutes)), Position.here)
        }

      }
    }
  }

}
