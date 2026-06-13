package net.flipsports.gmx.streaming.sbtech.streams

import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, CustomStream, MetaParameters}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.Types
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.filters.v1.TopupAmountFilter
import net.flipsports.gmx.streaming.sbtech.streams.builders.{CasinoBetsStreamBuilder, SportBetsStreamBuilder}
import net.flipsports.gmx.streaming.sbtech.streams.downstreams.TopUpCalculationDownstream
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

class MarketingCampaignsRewardsDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends CustomStream(metaParameters, businessMetaParameters) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.marketing-campaigns-rewards-settlement-data-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sportBetsSourceTopic: String = configuration.sourceTopics.sportBetsInfo.format(businessMetaParameters.brand().sourceBrand.name)

  val casinoBetsSourceTopic: String = configuration.sourceTopics.casinoBets.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.rewardsPoint.format(businessMetaParameters.brand().sourceBrand.name)

  lazy val casinoBetEvents: SourceFunction[Types.CasinoBets.Source] = KafkaSource(casinoBetsSourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
    .specificKeyValue(classOf[Types.CasinoBets.KeyType], classOf[Types.CasinoBets.ValueType])

  lazy val sportBetsEvents: SourceFunction[Types.SportBets.Source] = KafkaSource(sportBetsSourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry)
    .specificKeyValue(classOf[Types.SportBets.KeyType], classOf[Types.SportBets.ValueType])

  lazy val topupEvents: SinkFunction[Types.Topup.Source] = KafkaSink(targetTopic, kafkaProperties).typedKeyAndValue(classOf[Long], classOf[CasinoAndSportBetsTopupData])

  override def buildStreamTopology(env: StreamExecutionEnvironment, brand: Brand)(implicit ec: ExecutionConfig): Unit = {
    val casinoBetsStream = casinoBetsStreamBuilder().build(casinoBetEvents, env)
    val sportBetsStream = sportBetsStreamBuilder().build(sportBetsEvents, env)
    val bets = casinoBetsStream.union(sportBetsStream)
    val topUps = topupCaluationDownstream()
      .process(env, bets)
      .filter(TopupAmountFilter())
    buildSink(topUps)
  }


  def casinoBetsStreamBuilder() = CasinoBetsStreamBuilder()

  def sportBetsStreamBuilder() = SportBetsStreamBuilder()

  def topupCaluationDownstream(): TopUpCalculationDownstream = new TopUpCalculationDownstream(businessMetaParameters.brand())

  def buildSink(dataStream: Types.Streams.TopupStream): Unit =  {
    dataStream.addSink(topupEvents)
  }

}


object MarketingCampaignsRewardsDataStream {
  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new MarketingCampaignsRewardsDataStream(metaParameters, businessMetaParameters, config).stream()
}
