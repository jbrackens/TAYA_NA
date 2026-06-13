package net.flipsports.gmx.streaming

import java.util.UUID

import com.dimafeng.testcontainers.{Container, ForEachTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.SportNationMetaParameters
import net.flipsports.gmx.streaming.sbtech.configs.{ConfigurationLoader, SbTechConfig}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.avro.Schema
import org.apache.kafka.common.serialization.{Deserializer, Serializer}

import scala.reflect.io.File

//TODO: move to engine
trait KafkaWithFlink extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForEachTestContainer
  with SchemaRegistryOperations {

  val brandMetaParameters = new SportNationMetaParameters {}
  val checkpoints = s"file://${File(".").toAbsolute.path}/target"


  override def container: Container = kafkaWithSchemaRegistryContainers

  def withEnvironment(test: (SbTechConfig, KafkaProperties, String) => Unit): Unit = {
    withFlink (new InternalFlinkMiniClusterRunner) { _ =>
      withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>
        val config = ConfigurationLoader.apply
        val localConfig = config.copy(
          kafka = kafkaProperties.withOffsetResetConfig("earliest"),
          sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
          targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
        )
        test(localConfig, kafkaProperties, schemaRegistryConnectionUrl)
      }
    }
  }

  def withSource[K,V](events: Seq[(K,V)], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties, key: Schema, value: Schema): Unit = {
    withSchemaValueOnSubject(schemaRegistryUrl, topic, value.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, key.toString)
    KafkaIO(kafkaProperties.withRegistry(schemaRegistryUrl), topic, schemaRegistryUrl)
      .produceBinary(events, SerDes.toAvro(key = true, schemaRegistryUrl).asInstanceOf[Serializer[K]], SerDes.toAvro(key = false, schemaRegistryUrl).asInstanceOf[Serializer[V]])
  }

  def withTopic(targetTopic: String, schemaRegistryUrl: String, key: Schema, value: Schema): Unit = {
    withSchemaKeyOnSubject(schemaRegistryUrl, targetTopic, key.toString)
    withSchemaValueOnSubject(schemaRegistryUrl, targetTopic, value.toString)
  }

  def getResult[V](kafkaProperties: KafkaProperties, topic: String, schemaRegistryUrl: String, value: Schema) = {
    KafkaIO(kafkaProperties.withGroupId(UUID.randomUUID().toString), topic, schemaRegistryUrl)
      .consumeBinary[Long, V](1)(SerDes.fromLong.asInstanceOf[Deserializer[Long]], SerDes.fromBinary(value).asInstanceOf[Deserializer[V]] )
  }

}
