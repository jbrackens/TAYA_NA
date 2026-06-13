package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.LineInfo.v1.{LineInfo, LineInfoId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.OfferOptionsDataProvider
import net.flipsports.gmx.streaming.sbtech.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OfferOptionsDataStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.{IntegerSerializer, Serializer}


class OfferOptionsStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Offer options stream" must {

    "publish messages to kafka and stream it" in {
      val messages = OfferOptionsDataProvider.all.map(b => (b.getLineId.asInstanceOf[Integer], b))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new OfferOptionsDataStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)
          val sourceTopic = job.sourceTopic
          val targetTopic = job.targetTopic
          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, sourceTopic, LineInfo.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, targetTopic, LineInfoId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, targetTopic, LineInfo.SCHEMA$.toString)
          // value topic not in schema registry
          KafkaIO(kafkaProperties, sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[Integer, LineInfo](messages, new IntegerSerializer, SerDes.toAvro(key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[LineInfo]])

          runAsyncJob(job.stream())

          val records = KafkaIO(kafkaProperties, targetTopic, schemaRegistryConnectionUrl).consumeAvro[LineInfoId, LineInfo](messages.size)(LineInfoId.SCHEMA$, LineInfo.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers

}
