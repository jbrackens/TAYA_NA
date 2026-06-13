package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.EventsInfo.v1.{EventInfo, EventInfoId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.OfferEventsDataProvider
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.OfferEventsDataStream
import net.flipsports.gmx.streaming.sbtech.{InternalFlinkMiniClusterRunner, Types}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.{IntegerSerializer, Serializer}


class OfferEventsStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Offer events stream" must {

    "publish messages to kafka and stream it" in {
      val messages: Seq[(Integer, Types.OfferEvents.SourceValue)] = OfferEventsDataProvider.all.map(b => (b.getEventID.asInstanceOf[Integer], b))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new OfferEventsDataStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)
          val sourceTopic = job.sourceTopic
          val targetTopic = job.targetTopic
          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, sourceTopic, EventInfo.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, targetTopic, EventInfoId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, targetTopic, EventInfo.SCHEMA$.toString)

          KafkaIO(kafkaProperties, sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[Integer, Types.OfferEvents.SourceValue](
              messages,
              new IntegerSerializer(),
              SerDes.toAvro(key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[Types.OfferEvents.SourceValue]]
            )

          runAsyncJob(job.stream())

          val records = KafkaIO(kafkaProperties, targetTopic, schemaRegistryConnectionUrl).consumeAvro[Types.OfferEvents.TargetKey, Types.OfferEvents.TargetValue](messages.size)(EventInfoId.SCHEMA$, EventInfo.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers

}
