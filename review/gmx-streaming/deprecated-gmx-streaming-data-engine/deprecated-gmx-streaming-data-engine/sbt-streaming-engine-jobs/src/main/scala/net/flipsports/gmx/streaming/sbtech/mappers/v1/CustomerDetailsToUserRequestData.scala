package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import net.flipsports.gmx.rewardcalculator.api.UserRequestData
import net.flipsports.gmx.streaming.common.job.KeyedRowMapper
import net.flipsports.gmx.streaming.sbtech.configs.{SbTechConfig, SourceBrand}
import org.apache.flink.api.java.tuple.Tuple2

trait CustomerDetailsToUserRequestData
  extends KeyedRowMapper[CustomerDetail, SbTechConfig, Long, UserRequestData, SourceBrand] {

  def mapToTarget: (CustomerDetail, SbTechConfig, SourceBrand) => Tuple2[Long, UserRequestData] = (customer, _, brand) => {
      val customerId = customer.getCustomerID
      new Tuple2(customerId.longValue() ,new UserRequestData(customerId.toString, brand.uuid, customer.getEmail.replaceFirst("_se_", "")))
    }
}
