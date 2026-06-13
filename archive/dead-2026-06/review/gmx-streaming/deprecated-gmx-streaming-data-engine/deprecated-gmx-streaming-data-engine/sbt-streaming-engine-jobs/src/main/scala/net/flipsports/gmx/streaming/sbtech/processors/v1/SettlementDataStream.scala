package net.flipsports.gmx.streaming.sbtech.processors.v1

import java.util.Properties

import SBTech.Microservices.DataStreaming.DTO.SportBets.v1.SettlementData
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.{KeyedFlatMapStream, PathUtils}
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.filters.v1.SettlementDataFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.SettlementDataToTopupData

class SettlementDataStream(brand: SourceBrand)(implicit configuration: SbTechConfig)
  extends KeyedFlatMapStream[SettlementData, SbTechConfig, Long, CasinoAndSportBetsTopupData, SourceBrand]((s"Sport bets events on brand ${brand.id}"), brand)
    with SettlementDataToTopupData
    with SettlementDataFilter {

  override def groupId: String = s"settlement-data-stream-${brand.name}"

  override def source: Option[String] = Some(s"${configuration.kafkaTopics.topicsPrefix}_${configuration.kafkaTopics.sportBetsInfo}_${brand.id}")

  override def target: String = s"${configuration.targetTopics.gmxMessaging}.${brand.name}-${configuration.targetTopics.rewardsPoint}"

  override def properties: Properties = configuration.kafka.properties

  override def sourceClass: Class[SettlementData] = classOf[SettlementData]

  override def targetClass: Class[CasinoAndSportBetsTopupData] = classOf[CasinoAndSportBetsTopupData]

  override def schemaRegistry: Option[String] =  configuration.getRegistry

  override def checkpointsLocation: String = PathUtils.checkpoints(configuration.checkpoints)

  override def keyClass: Class[Long] = classOf[Long]
}

object SettlementDataStream {

  def execute(brand: SourceBrand)(implicit configuration: SbTechConfig): Unit = new SettlementDataStream(brand).execute()

}

