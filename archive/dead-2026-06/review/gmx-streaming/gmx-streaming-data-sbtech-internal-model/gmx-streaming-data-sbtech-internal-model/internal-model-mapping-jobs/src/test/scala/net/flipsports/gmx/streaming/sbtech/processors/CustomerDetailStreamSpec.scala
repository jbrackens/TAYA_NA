package net.flipsports.gmx.streaming.sbtech.processors

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, SportNationMetaParameters}
import net.flipsports.gmx.streaming.data.v1.CustomerDetailsDataProvider
import net.flipsports.gmx.streaming.sbtech.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.sbtech.configs.ConfigurationLoader
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams.CustomerDetailsStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes
import org.apache.kafka.common.serialization.{IntegerSerializer, Serializer}

class CustomerDetailStreamSpec  extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Customer details stream" must {

    "publish messages to kafka and stream it" in {

      val messages = CustomerDetailsDataProvider.all.map(cd => (new Integer(cd.getCustomerID), cd))

      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka(KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val job = new CustomerDetailsStream(MetaParameters(""), new SportNationMetaParameters {}, localConfig)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.sourceTopic, CustomerDetail.SCHEMA$.toString)
          // value topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.targetTopic, CustomerDetailCustomerId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.targetTopic, CustomerDetail.SCHEMA$.toString)
          KafkaIO(kafkaProperties, job.sourceTopic, schemaRegistryConnectionUrl)
            .produceBinary[Integer, CustomerDetail](messages,new IntegerSerializer().asInstanceOf[Serializer[Integer]], SerDes.toAvro(key = false, schemaRegistryConnectionUrl).asInstanceOf[Serializer[CustomerDetail]])

          runAsyncJob(job.stream())

          val records = KafkaIO(localConfig.kafka, job.targetTopic, schemaRegistryConnectionUrl).consumeAvro[CustomerDetailCustomerId, CustomerDetail](1)(CustomerDetailCustomerId.SCHEMA$, CustomerDetail.SCHEMA$)

          records.size should be(messages.size)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers

}
