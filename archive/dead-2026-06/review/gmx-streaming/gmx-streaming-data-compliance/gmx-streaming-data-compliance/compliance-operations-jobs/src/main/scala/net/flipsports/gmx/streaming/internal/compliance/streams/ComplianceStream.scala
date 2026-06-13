package net.flipsports.gmx.streaming.internal.compliance.streams

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.internal.compliance.Types.{Compliance, WalletTransactions}
import net.flipsports.gmx.streaming.internal.compliance.configs.{AppConfig, TopicNames}
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class ComplianceStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: AppConfig)
  extends CustomStream(metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.compliance-validation-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val targetTopic: String = TopicNames.Target.complianceValidation(configuration, businessMetaParameters)

  def filtersDefinition: InputOutputFilter[Tuple2[WalletTransactions.KeyType, WalletTransactions.ValueType], Tuple2[Compliance.KeyType, Compliance.ValueType]] = InputOutputFilter.alwaysPositive

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {
    val target = KafkaSink(targetTopic, kafkaProperties, configuration.targetTopics.schemaRegistry)
      .keyAndValue(classOf[Compliance.KeyType], classOf[Compliance.ValueType])

    new DepositChangeDownstream(metaParameters, businessMetaParameters, configuration, kafkaProperties)
      .processStream(env)
      .addSink(target)
  }
}

object ComplianceStream {

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters,  config: AppConfig): Unit = new ComplianceStream(metaParameters,businessMetaParameters, config).stream()

}

