package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.data.v1.CasinoBetDataProvider
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.CasinoBetStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.{Deserializer, LongDeserializer}

import scala.reflect.io.File

class CasinoBetStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {


  "Casino bet stream" must {

      "publish messages to kafka and stream it" in {
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

            val job = new CasinoBetStream(
              metaParameters = MetaParameters("", Some(checkpoints)),
              businessMetaParameters = params,
              configuration = localConfig)

            // source topic
            withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, CasinoBet.SCHEMA$.toString)
            withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, CasinoBetCustomerId.SCHEMA$.toString)

            val customerIdSerDes = SerDes.toAvro(key = true, schemaRegistryConnectionUrl)
            val casinoBetSerDes = SerDes.toAvro(key = false, schemaRegistryConnectionUrl)

            KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl).produceBinary(messages, customerIdSerDes, casinoBetSerDes)

            runAsyncJob(job.stream())
            val valueDeserializer = SerDes.fromBinary[CasinoAndSportBetsTopupData](CasinoAndSportBetsTopupData.SCHEMA$)
            val keyDeserializer: Deserializer[Long] = new LongDeserializer().asInstanceOf[Deserializer[Long]]

            val records = KafkaIO(kafkaProperties.withGroupId("1"), job.targetTopic).consumeBinary[Long, CasinoAndSportBetsTopupData](1)(keyDeserializer, valueDeserializer)

            records.size should be(8)
            val first = records.head
            first._1.toString shouldBe first._2.getExternalUserId.toString

          }
        }

      }
    }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
