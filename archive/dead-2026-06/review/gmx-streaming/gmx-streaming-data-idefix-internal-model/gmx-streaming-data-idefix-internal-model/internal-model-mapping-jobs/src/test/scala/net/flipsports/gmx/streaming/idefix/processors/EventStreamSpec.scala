package net.flipsports.gmx.streaming.idefix.processors

import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import com.idefix.events.{Event, EventId}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.EventDataProvider
import net.flipsports.gmx.streaming.idefix.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.idefix.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.idefix.processors.v1.downstreams.EventStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.Serializer


class EventStreamSpec extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Event stream" must {

    "publish messages to kafka and stream it" in {
      val messages = EventDataProvider.all.map(b => (b.getCustomerId.toString, b))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new EventStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)
          val sourceTopic = job.sourceTopic
          val targetTopic = job.targetTopic
          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, sourceTopic, Event.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, targetTopic, EventId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, targetTopic, Event.SCHEMA$.toString)
          // value topic not in schema registry
          KafkaIO(kafkaProperties, sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[String, Event](messages, SerDes.toLong.asInstanceOf[Serializer[String]], SerDes.toAvro(key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[Event]])

          runAsyncJob(job.stream())

          val records = KafkaIO(kafkaProperties, targetTopic, schemaRegistryConnectionUrl).consumeAvro[EventId, Event](messages.size)(EventId.SCHEMA$, Event.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers

}
