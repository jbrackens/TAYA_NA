package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.SettlementDataProvider
import net.flipsports.gmx.streaming.sbtech.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.SettlementDataStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.Serializer

class SettlementDataStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Settlement data stream" must {

    "publish messages to kafka and stream with filtering" in {
      val messages = SettlementDataProvider.all.map(b => (b.getPurchase.getSQLTicketID, b))
      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new SettlementDataStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, SettlementData.SCHEMA$.toString)
          // value topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.targetTopic, SettlementDataCustomerId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.targetTopic, SettlementData.SCHEMA$.toString)

          runAsyncJob(job.stream())

          KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[Long, SettlementData](messages, SerDes.toLong.asInstanceOf[Serializer[Long]], SerDes.toAvro( key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[SettlementData]])
          val records = KafkaIO(localConfig.kafka, job.targetTopic, schemaRegistryConnectionUrl)
            .consumeAvro[SettlementDataCustomerId, SettlementData](12)(SettlementDataCustomerId.SCHEMA$, SettlementData.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
