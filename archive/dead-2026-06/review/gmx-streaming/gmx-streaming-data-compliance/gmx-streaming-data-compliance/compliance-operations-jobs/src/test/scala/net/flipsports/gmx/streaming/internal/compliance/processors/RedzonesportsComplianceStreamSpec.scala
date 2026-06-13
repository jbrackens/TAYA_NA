package net.flipsports.gmx.streaming.internal.compliance.processors

import SBTech.Microservices.DataStreaming.DTO.WalletTransaction.v1.{WalletTransaction, WalletTransactionCustomerId}
import com.dimafeng.testcontainers.{Container, ForAllTestContainer}
import net.flipsports.gmx.dataapi.internal.compliance.validation.{ComplianceCustomerId, ValidationCheck}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{MetaParameters, RedZoneMetaParameters}
import net.flipsports.gmx.streaming.internal.compliance.InternalFlinkMiniClusterRunner
import net.flipsports.gmx.streaming.internal.compliance.configs.{ConfigurationLoader, TopicNames}
import net.flipsports.gmx.streaming.internal.compliance.data.v1.WalletTransactionDataProvider
import net.flipsports.gmx.streaming.internal.compliance.streams.ComplianceStream
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import net.flipsports.gmx.streaming.tests.containers.ConfluentPlatformContainers
import net.flipsports.gmx.streaming.tests.kafka.{KafkaIO, SchemaRegistryOperations}
import net.flipsports.gmx.streaming.tests.runners.FlinkJobsTestRunner
import net.flipsports.gmx.streaming.tests.serializers.SerDes

import scala.reflect.io.File

class RedzonesportsComplianceStreamSpec  extends StreamingTestBase
  with FlinkJobsTestRunner
  with ConfluentPlatformContainers
  with ForAllTestContainer
  with SchemaRegistryOperations {

  "Customer state change stream " must {

    "publish messages to kafka and stream it" in {

      val walletTransactions = WalletTransactionDataProvider.all.map(element => (element.f0, element.f1))
      withFlink (new InternalFlinkMiniClusterRunner) { _ =>
        withKafka (KafkaProperties()) { (kafkaProperties, schemaRegistryConnectionUrl) =>

          val config = ConfigurationLoader.apply

          val localConfig = config.copy(
            kafka = kafkaProperties.withOffsetResetConfig("earliest"),
            sourceTopics = config.sourceTopics.copy(schemaRegistry = schemaRegistryConnectionUrl),
            targetTopics = config.targetTopics.copy(schemaRegistry = schemaRegistryConnectionUrl)
          )

          val checkpoints = s"file://${File(".").toAbsolute.path}/target"

          val params = new RedZoneMetaParameters {}
          val job = new ComplianceStream(
            metaParameters = MetaParameters("", Some(checkpoints)),
            businessMetaParameters = params,
            configuration = localConfig)

          val walletUpdates = TopicNames.Source.walletUpdates(localConfig, params)

          // source topic
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, walletUpdates, WalletTransaction.SCHEMA$.toString)
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, walletUpdates, WalletTransactionCustomerId.SCHEMA$.toString)
          // value topic
          withSchemaKeyOnSubject(schemaRegistryConnectionUrl, job.targetTopic, ComplianceCustomerId.SCHEMA$.toString)
          withSchemaValueOnSubject(schemaRegistryConnectionUrl, job.targetTopic, ValidationCheck.SCHEMA$.toString)

          KafkaIO(kafkaProperties, walletUpdates, schemaRegistryConnectionUrl)
            .produceBinary(walletTransactions, SerDes.toAvro(key = true, schemaRegistryConnectionUrl), SerDes.toAvro(key = false, schemaRegistryConnectionUrl))

          runAsyncJob(job.stream())


          val records = KafkaIO(localConfig.kafka, job.targetTopic, schemaRegistryConnectionUrl)
            .consumeAvro[ComplianceCustomerId, ValidationCheck](1)(ComplianceCustomerId.SCHEMA$, ValidationCheck.SCHEMA$)

          records.filter(it => it._1.getExternalUserId.toString.equalsIgnoreCase("99999")).size shouldEqual(2)

          records.size shouldEqual(2)
        }
      }
    }
  }

  override def container: Container = kafkaWithSchemaRegistryContainers
}
