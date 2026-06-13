package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.Multibets4xRewardsSettlementDataStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.Deserializer

import scala.reflect.io.File

class Reward4xSingleBetBonusSettlementDataStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Settlement data stream" must {

    "publish messages to kafka and stream with filtering" in {
      val messages = SettlementDataProvider("4xpoints/settlementdata.json").allAsTuple

      withFlink(new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>


          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val checkpoints = s"file://${File(".").toAbsolute.path}/target"

          val params = new RedZoneMetaParameters {}

          val job = new Multibets4xRewardsSettlementDataStream(
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, SettlementData.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, SettlementDataCustomerId.SCHEMA$.toString)

          KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary(messages, SerDes.toAvro(key = true, schemaRegistryConnectionUrl), SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          runAsyncJob(job.stream())

          val records = KafkaIO(localConfig.kafka.withGroupId("1"), job.targetTopic)
            .consumeBinary[Long, CasinoAndSportBetsTopupData](1)(SerDes.fromLong.asInstanceOf[Deserializer[Long]], SerDes.fromBinary(CasinoAndSportBetsTopupData.SCHEMA$))

          records.size should be(1)
        }
      }

    }

  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
