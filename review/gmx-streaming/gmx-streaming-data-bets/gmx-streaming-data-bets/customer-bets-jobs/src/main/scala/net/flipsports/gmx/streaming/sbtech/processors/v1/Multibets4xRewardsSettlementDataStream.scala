package net.flipsports.gmx.streaming.sbtech.processors.v1

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.{SettlementData, SettlementDataCustomerId}
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.common.job.{BusinessMetaParameters, MetaParameters, QueuedStream}
import net.flipsports.gmx.streaming.common.kafka.sink.KafkaSink
import net.flipsports.gmx.streaming.common.kafka.source.KafkaSource
import net.flipsports.gmx.streaming.sbtech.configs.SbTechConfig
import net.flipsports.gmx.streaming.sbtech.filters.v1.MultiBets4xRewardsBetInfoDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.MultiBets4xRewardsSettlementDataToTopupData
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}
import org.apache.flink.api.java.typeutils.{TupleTypeInfo, TypeExtractor}
import org.apache.flink.streaming.api.functions.sink.SinkFunction
import org.apache.flink.streaming.api.functions.source.SourceFunction
import org.apache.flink.streaming.api.scala.DataStream


class Multibets4xRewardsSettlementDataStream(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, configuration: SbTechConfig)
  extends QueuedStream[FlinkTuple[SettlementDataCustomerId, SettlementData], FlinkTuple[Long, CasinoAndSportBetsTopupData]](metaParameters, businessMetaParameters)(
    RewardsMarketingSettlementDataStream.inputypeInformation, RewardsMarketingSettlementDataStream.outputTypeInformation) {

  val kafkaProperties: KafkaProperties = configuration.kafka.withGroupId(s"gmx-streaming.multibets-four-x-rewards-settlement-data-stream-${businessMetaParameters.brand().sourceBrand.name}")

  val sourceTopic: String = configuration.sourceTopics.sportBetsInfo.format(businessMetaParameters.brand().sourceBrand.name)

  val targetTopic: String = configuration.targetTopics.rewardsPoint.format(businessMetaParameters.brand().sourceBrand.name)

  override def transform(dataStream: DataStream[FlinkTuple[SettlementDataCustomerId, SettlementData]])(implicit sourceTypeInformation: TypeInformation[FlinkTuple[SettlementDataCustomerId, SettlementData]], targetTypeInformation: TypeInformation[FlinkTuple[Long, CasinoAndSportBetsTopupData]]): DataStream[FlinkTuple[Long, CasinoAndSportBetsTopupData]] =
    dataStream.flatMap(new MultiBets4xRewardsSettlementDataToTopupData(businessMetaParameters.brand()))

  override def source(implicit ec: ExecutionConfig): SourceFunction[FlinkTuple[SettlementDataCustomerId, SettlementData]] = KafkaSource(sourceTopic, kafkaProperties, configuration.sourceTopics.schemaRegistry).specificKeyValue(classOf[SettlementDataCustomerId], classOf[SettlementData])

  override def sink(implicit ec: ExecutionConfig): SinkFunction[FlinkTuple[Long, CasinoAndSportBetsTopupData]] = KafkaSink(targetTopic, kafkaProperties).typedKeyAndValue(classOf[Long], classOf[CasinoAndSportBetsTopupData])

  override def filtersDefinition: InputOutputFilter[FlinkTuple[SettlementDataCustomerId, SettlementData], FlinkTuple[Long, CasinoAndSportBetsTopupData]] = new MultiBets4xRewardsBetInfoDataFilter()

}

object Multibets4xRewardsSettlementDataStream {

  implicit val inputValueTypeInformation: TypeInformation[SettlementData] = TypeExtractor.getForClass(classOf[SettlementData])

  implicit val inputKeyTypeInformation: TypeInformation[SettlementDataCustomerId] = TypeExtractor.getForClass(classOf[SettlementDataCustomerId])

  implicit val outputKeyTypeInformation: TypeInformation[Long] = TypeExtractor.getForClass(classOf[Long])

  implicit val outputValueTypeInformation: TypeInformation[CasinoAndSportBetsTopupData] = TypeExtractor.getForClass(classOf[CasinoAndSportBetsTopupData])

  implicit val inputypeInformation: TupleTypeInfo[FlinkTuple[SettlementDataCustomerId, SettlementData]] = new TupleTypeInfo(classOf[FlinkTuple[SettlementDataCustomerId, SettlementData]], inputKeyTypeInformation, inputValueTypeInformation)

  implicit val outputTypeInformation: TupleTypeInfo[FlinkTuple[Long, CasinoAndSportBetsTopupData]] = new TupleTypeInfo(classOf[FlinkTuple[Long, CasinoAndSportBetsTopupData]], outputKeyTypeInformation, outputValueTypeInformation)

  def execute(metaParameters: MetaParameters, businessMetaParameters: BusinessMetaParameters, config: SbTechConfig): Unit = new Multibets4xRewardsSettlementDataStream(metaParameters, businessMetaParameters, config).stream()

}



