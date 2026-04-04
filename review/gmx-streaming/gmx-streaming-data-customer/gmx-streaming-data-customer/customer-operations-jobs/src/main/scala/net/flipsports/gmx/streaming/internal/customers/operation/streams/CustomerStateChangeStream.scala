package net.flipsports.gmx.streaming.internal.customers.operation.streams

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.internal.customers.operation.StateChangeImplicits.StateChangeimplicit
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Streams._
import net.flipsports.gmx.streaming.internal.customers.operation.Types.{CustomerDetail, CustomerStateChange, Logins}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.internal.customers.operation.dto.Streams
import net.flipsports.gmx.streaming.internal.customers.operation.streams.builders.{CustomerStreamBuilder, LoginsStreamBuilder}
import net.flipsports.gmx.streaming.internal.customers.operation.streams.joiner.{CustomerLoginJoiner, MultiStreamJoiner}
import net.flipsports.gmx.streaming.internal.customers.operation.udf.CustomerStateChangeDeduplicationFunction
import org.apache.flink.annotation.VisibleForTesting
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.TimeCharacteristic
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class CustomerStateChangeStream(args: Array[String], metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: AppConfig)
  extends CustomStream(args, metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.customer-state-change-on-${businessMetaParameters.brand().sourceBrand.name}")

  val customerDetailsSourceTopic: String = TopicNames.Source.customerUpdates(configuration, businessMetaParameters)

  val customerLoginTopic = TopicNames.Source.logins(configuration, businessMetaParameters)

  val targetTopic: String = configuration.targetTopics.tags.format(businessMetaParameters.brand().sourceBrand.name)

  lazy val  customerUpdateEvents: SourceFunction[CustomerDetail.Source] = KafkaSource(customerDetailsSourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
    .specificKeyValue[CustomerDetail.KeyType, CustomerDetail.ValueType](classOf[CustomerDetail.KeyType], classOf[CustomerDetail.ValueType])

  lazy val customerLoginEvents: SourceFunction[Logins.Source] = KafkaSource(customerLoginTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
    .specificKeyValue[Logins.KeyType, Logins.ValueType](classOf[Logins.KeyType], classOf[Logins.ValueType])

  def buildSink(dataStream: StateChangeStream): Unit = if (dataStream != null) {
    val sink = KafkaSink(targetTopic, kafkaProperties, configuration.targetTopics.schemaRegistry)
      .keyAndValue(classOf[CustomerStateChange.KeyType], classOf[CustomerStateChange.ValueType])
    dataStream.addSink(sink).name("customer-state-change-events")
  }

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {
    failIfAnyDummyEnabled()
    env.setStreamTimeCharacteristic(TimeCharacteristic.IngestionTime)
    val customersStream = buildCustomerStream().build(env, customerUpdateEvents)
    val loginsStream = buildLoginsStream().build(env, customerLoginEvents)
    val customerLoginsStream = CustomerLoginJoiner.join(customersStream, loginsStream)
    val streams = Streams(customers = customersStream, logins = loginsStream, customerLogins = customerLoginsStream)
    val customerStateChange = buildMultiStreamJoiner().join(env, streams)
    val deduplicated = withDeduplication(customerStateChange.keyBy(_.f0)(StateChangeimplicit.key))
    buildSink(deduplicated)
  }

  def buildCustomerStream(): CustomerStreamBuilder = CustomerStreamBuilder()

  def buildLoginsStream(): LoginsStreamBuilder = LoginsStreamBuilder()

  def buildMultiStreamJoiner(): MultiStreamJoiner = MultiStreamJoiner(businessMetaParameters, configuration.features)

  protected def withDeduplication(source: StateChangeStream): StateChangeStream =
    source.flatMap(CustomerStateChangeDeduplicationFunction())(StateChangeimplicit.keyWithValue)

  // method should be used in tests
  @VisibleForTesting
  def failIfAnyDummyEnabled() = {
    val features = configuration.features
    if (features.isAnyDummy()) {
      throw new RuntimeException("If there is any dummy flow enabled it should not ")
    }
  }
}

object CustomerStateChangeStream {

  def execute(args: Array[String], metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: AppConfig): Unit = new CustomerStateChangeStream(args, metaParameters, businessMetaParameters, config).stream()

}

