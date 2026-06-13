package net.flipsports.gmx.streaming.sbtech.processors.v1

import java.util.Properties

import SBTech.Microservices.DataStreaming.DTO.CasinoBet.v1.CasinoBet
import net.flipsports.gmx.rewardcalculator.api.CasinoAndSportBetsTopupData
import net.flipsports.gmx.streaming.common.job.{KeyedMapStream, MapStream, PathUtils}
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.filters.v1.CasinoBetFilter
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CasinoBetToTopupData

class CasinoBetStream(brand: SourceBrand)(implicit configuration: SbTechConfig)
    extends KeyedMapStream[CasinoBet, SbTechConfig, Long, CasinoAndSportBetsTopupData, SourceBrand]((s"Casino bets events on brand ${brand.id}"), brand)
    with CasinoBetToTopupData
    with CasinoBetFilter {

  override def groupId: String = s"casino-bet-stream-${brand.name}"

  override def source: Option[String] = Some(s"${configuration.kafkaTopics.topicsPrefix}_${configuration.kafkaTopics.casinoBets}_${brand.id}")

  override def target: String = s"${configuration.targetTopics.gmxMessaging}.${brand.name}-${configuration.targetTopics.rewardsPoint}"

  override def properties: Properties = configuration.kafka.properties

  override def sourceClass: Class[CasinoBet] = classOf[CasinoBet]

  override def keyClass: Class[Long] = classOf[Long]

  override def targetClass: Class[CasinoAndSportBetsTopupData] = classOf[CasinoAndSportBetsTopupData]

  override def schemaRegistry: Option[String] =  configuration.getRegistry

  override def checkpointsLocation: String = PathUtils.checkpoints(configuration.checkpoints)
}

object CasinoBetStream {

  def execute(brand: SourceBrand)(implicit configuration: SbTechConfig): Unit = new CasinoBetStream(brand).execute()

}
