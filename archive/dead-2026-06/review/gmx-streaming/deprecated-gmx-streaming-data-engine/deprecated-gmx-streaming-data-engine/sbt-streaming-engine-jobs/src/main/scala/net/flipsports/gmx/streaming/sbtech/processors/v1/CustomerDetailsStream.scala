package net.flipsports.gmx.streaming.sbtech.processors.v1

import java.util.Properties

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import net.flipsports.gmx.rewardcalculator.api.UserRequestData
import net.flipsports.gmx.streaming.common.job.{KeyedMapStream, PathUtils}
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import net.flipsports.gmx.streaming.sbtech.mappers.v1.CustomerDetailsToUserRequestData

class CustomerDetailsStream(brand: SourceBrand)(implicit configuration: SbTechConfig)
  extends KeyedMapStream[CustomerDetail, SbTechConfig, Long, UserRequestData, SourceBrand]((s"Customer details events on brand ${brand.id}"), brand)
    with CustomerDetailsToUserRequestData {

  override def groupId: String = s"customer-details-stream-${brand.name}"

  override def source: Option[String] = Some(s"${configuration.kafkaTopics.topicsPrefix}_${configuration.kafkaTopics.customerDetails}_${brand.id}")

  override def target: String = s"${configuration.targetTopics.gmxMessaging}.${brand.name}-${configuration.targetTopics.customerUpsert}"

  override def properties: Properties = configuration.kafka.properties

  override def sourceClass: Class[CustomerDetail] = classOf[CustomerDetail]

  override def keyClass: Class[Long] = classOf[Long]

  override def targetClass: Class[UserRequestData] = classOf[UserRequestData]

  override def schemaRegistry: Option[String] =  configuration.getRegistry

  override def checkpointsLocation: String = PathUtils.checkpoints(configuration.checkpoints)
}

object CustomerDetailsStream {

  def execute(brand: SourceBrand)(implicit configuration: SbTechConfig): Unit = new CustomerDetailsStream(brand).execute()

}


