package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.{CasinoBet, CasinoBetCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.CasinoBetDataProvider
import net.flipsports.gmx.streaming.sbtech.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CasinoBetStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.Serializer


class CasinoBetStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Casino bet stream" must {

    "publish messages to kafka and stream it" in {
      val messages = CasinoBetDataProvider.all.map(b => (b.getCustomerID.toLong, b))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new CasinoBetStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)
          val sourceTopic = job.sourceTopic
          val targetTopic = job.targetTopic
          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, sourceTopic, CasinoBet.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, targetTopic, CasinoBetCustomerId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, targetTopic, CasinoBet.SCHEMA$.toString)
          // value topic not in schema registry
          KafkaIO(kafkaProperties, sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[Long, CasinoBet](messages, SerDes.toLong.asInstanceOf[Serializer[Long]], SerDes.toAvro(key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[CasinoBet]])

          runAsyncJob(job.stream())

          val records = KafkaIO(kafkaProperties, targetTopic, schemaRegistryConnectionUrl).consumeAvro[CasinoBetCustomerId, CasinoBet](messages.size)(CasinoBetCustomerId.SCHEMA$, CasinoBet.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers

}
