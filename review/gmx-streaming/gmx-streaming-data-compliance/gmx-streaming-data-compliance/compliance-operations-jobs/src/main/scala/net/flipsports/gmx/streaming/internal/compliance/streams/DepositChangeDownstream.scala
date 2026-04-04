package net.flipsports.gmx.streaming.internal.compliance.streams

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.internal.compliance.Implicits
import net.flipsports.gmx.streaming.internal.compliance.Implicits.{ComplianceImplicit, WalletTransactionsImplicit}
import net.flipsports.gmx.streaming.internal.compliance.Types.{Compliance, WalletTransactions}
import net.flipsports.gmx.streaming.internal.compliance.configs.{AppConfig, TopicNames}
import net.flipsports.gmx.streaming.internal.compliance.filters.v1.ConfirmedDeposit
import net.flipsports.gmx.streaming.internal.compliance.mappers.v1.MapperFactory
import net.flipsports.gmx.streaming.internal.compliance.udf.WalletTransactionDeduplicationFunction
import org.apache.flink.api.java.tuple
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.{DataStream, StreamExecutionEnvironment}

class DepositChangeDownstream(metaParameters: MetaParameters,
                              businessMetaParameters: BusinessMetaParameters,
                              configuration: AppConfig,
                              kafkaProperties: KafkaProperties) {

  val walletTransactionsSourceTopic: String = TopicNames.Source.walletUpdates(configuration, businessMetaParameters)

  def processStream(env: StreamExecutionEnvironment): DataStream[tuple.Tuple2[Compliance.KeyType, Compliance.ValueType]] = {

    val customerWalletTransactionsRaw: SourceFunction[Tuple2[WalletTransactions.KeyType, WalletTransactions.ValueType]] = KafkaSource(walletTransactionsSourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
      .specificKeyValue(classOf[WalletTransactions.KeyType], classOf[WalletTransactions.ValueType])

    env
      .addSource(customerWalletTransactionsRaw)(WalletTransactionsImplicit.keyWithValue)
      .filter(ConfirmedDeposit())
      .keyBy(_.f0.getCustomerID)(Implicits.Customer.key)
      .flatMap(WalletTransactionDeduplicationFunction(businessMetaParameters.brand()))(WalletTransactionsImplicit.keyWithValue)
      .flatMap(MapperFactory.depositChange(businessMetaParameters.brand()))(ComplianceImplicit.keyWithValue)
  }

}
