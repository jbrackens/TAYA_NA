package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.OperatorSelectionsDataProvider
import net.flipsports.gmx.streaming.sbtech.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OperatorSelectionsDataStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.Serializer
import sbtech.sportsData.contracts.avro.{selection, selectionId}

class OperatorDataSelectionsDataStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Settlement data stream" must {

    "publish messages to kafka and stream with filtering" in {
      val selectionEvents = OperatorSelectionsDataProvider.all
      selectionEvents.head.setField(null, 1)
      val messages = selectionEvents.map(element => (element.f0, element.f1))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new OperatorSelectionsDataStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, selection.SCHEMA$.toString)
          // value topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.targetTopic, selectionId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.targetTopic, selection.SCHEMA$.toString)

          runAsyncJob(job.stream())

          KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[String, selection](messages, SerDes.toStringSerDes, SerDes.toAvro( key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[selection]])
          val records = KafkaIO(localConfig.kafka, job.targetTopic, schemaRegistryConnectionUrl)
            .consumeAvro[SettlementDataCustomerId, SettlementData](messages.size)(selectionId.SCHEMA$, selection.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
