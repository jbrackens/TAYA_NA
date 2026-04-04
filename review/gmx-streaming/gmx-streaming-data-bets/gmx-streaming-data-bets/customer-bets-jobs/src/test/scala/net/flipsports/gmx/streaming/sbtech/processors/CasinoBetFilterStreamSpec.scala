package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.data.v1.CasinoBetDataProvider
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetFilterStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.StringDeserializer

import scala.reflect.io.File

class CasinoBetFilterStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Casino bet stream" must {

    "publish messages to kafka and filter" in {
      val messages = CasinoBetDataProvider().allAsTuple
      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka (KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val checkpoints = s"file://${File(".").toAbsolute.path}/target"

          val params = new RedZoneMetaParameters {}

          val job = new CasinoBetFilterStream(
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, CasinoBet.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, CasinoBetCustomerId.SCHEMA$.toString)

          KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary(messages, SerDes.toAvro(key = true, schemaRegistryConnectionUrl), SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          runAsyncJob(job.stream())

          val records = KafkaIO(kafkaProperties.withGroupId("1"), job.targetTopic)
            .consumeBinary[String, String](1)(new StringDeserializer(), new StringDeserializer())

          records.size should be(2)

        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}

