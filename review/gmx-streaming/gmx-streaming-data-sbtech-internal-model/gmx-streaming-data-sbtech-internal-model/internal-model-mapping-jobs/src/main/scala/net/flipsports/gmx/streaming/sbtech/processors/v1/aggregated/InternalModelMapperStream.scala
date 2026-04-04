package net.flipsports.gmx.streaming.sbtech.processors.v1.aggregated

import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.sbtech.configs.{Features, SbTechConfig}
import net.flipsports.gmx.streaming.sbtech.processors.v1.downstreams._
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment


class InternalModelMapperStream(features: Features, metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends CustomStream(metaParameters, businessMetaParameters) {

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {

    // bets
    if (features.sportBets) new SettlementDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    if (features.casinoBets) new CasinoBetStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)

    // customer state
    if (features.customerDetails) new CustomerDetailsStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    if (features.logins) new LoginsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    // wallet operarations
    if (features.walletTransactions) new WalletTransactionsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)

    // odds data
    if (features.odds) new OperatorEventsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    if (features.odds) new OperatorMarketsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    if (features.odds) new OperatorSelectionsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)

    // offer events
    if (features.offerEvents) new OfferEventsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)
    // offer options in events
    if (features.offerOptions) new OfferOptionsDataStream(metaParameters, businessMetaParameters, configuration).buildStreamTopology(env, brand)

  }
}

object InternalModelMapperStream {

  def execute(features: Features, metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new InternalModelMapperStream(features, metaParameters, businessMetaParameters, config).stream()

}