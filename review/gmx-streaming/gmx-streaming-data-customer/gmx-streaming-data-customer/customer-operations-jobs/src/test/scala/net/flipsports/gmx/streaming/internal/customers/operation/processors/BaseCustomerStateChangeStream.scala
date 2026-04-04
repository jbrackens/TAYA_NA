package net.flipsports.gmx.streaming.internal.customers.operation.processors

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import SBTech.Microservices.DataStreaming.DTO.Login.v1.{Login, LoginCustomerId}
import com.dimafeng.testcontainers.{Container, ForEachTestContainer}
import net.flipsports.gmx.dataapi.internal.customers.operations.{CustomerOperationId, StateChange}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.SportNationMetaParameters
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, ConfigurationLoader, Features}
import net.flipsports.gmx.streaming.internal.customers.operation.data.v1.{CustomerDetailsDataProvider, LoginDataProvider}
import net.flipsports.gmx.streaming.internal.customers.operation.{InternalFlinkMiniClusterRunner, Types}
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes

import scala.reflect.io.File

abstract class BaseCustomerStateChangeStream extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForEachTestContainer
  with SchemaRegistryOperations {

  type Customers = (Types.CustomerDetail.KeyType, Types.CustomerDetail.ValueType)
  type Logins = (Types.Logins.KeyType, Types.Logins.ValueType)

  val messages = CustomerDetailsDataProvider.asScalaAllWithCurrentRegistration()
  val loginMessages = LoginDataProvider.asScalaAllByCreationDate()
  val metaParameters = new SportNationMetaParameters {}
  val checkpoints = s"file://${File(".").toAbsolute.path}/target"


  override def container: Container = kafkaWithSchemaRegistryContainers

  def withEnvironment(test: (AppConfig, KafkaProperties, String) => Unit): Unit = {
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

  def withCustomers(events: Seq[Customers], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties): Unit = {
    withSchemaValueOnSubject(schemaRegistryUrl, topic, CustomerDetail.SCHEMA$.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, CustomerDetailCustomerId.SCHEMA$.toString)
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .produceBinary(events, SerDes.toAvro(key = true, schemaRegistryUrl), SerDes.toAvro(key = false, schemaRegistryUrl))
  }

  def withLogins(events: Seq[Logins], schemaRegistryUrl: String, topic: String, kafkaProperties: KafkaProperties): Unit = {
    withSchemaValueOnSubject(schemaRegistryUrl, topic, Login.SCHEMA$.toString)
    withSchemaKeyOnSubject(schemaRegistryUrl, topic, LoginCustomerId.SCHEMA$.toString)
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .produceBinary(events, SerDes.toAvro(key = true, schemaRegistryUrl), SerDes.toAvro(key = false, schemaRegistryUrl))
  }

  def withResult(targetTopic: String, schemaRegistryUrl: String): Unit = {
    withSchemaKeyOnSubject(schemaRegistryUrl, targetTopic, CustomerOperationId.SCHEMA$.toString)
    withSchemaValueOnSubject(schemaRegistryUrl, targetTopic, StateChange.SCHEMA$.toString)
  }

  def getResult(kafkaProperties: KafkaProperties, topic: String, schemaRegistryUrl: String) = {
    KafkaIO(kafkaProperties, topic, schemaRegistryUrl)
      .consumeAvro[CustomerOperationId, StateChange](1)(CustomerOperationId.SCHEMA$, StateChange.SCHEMA$)
  }

  def withFeatures(applicationConfig: AppConfig, dummyFeatures: Features): AppConfig = {
    applicationConfig.copy(features = dummyFeatures)
  }

}
