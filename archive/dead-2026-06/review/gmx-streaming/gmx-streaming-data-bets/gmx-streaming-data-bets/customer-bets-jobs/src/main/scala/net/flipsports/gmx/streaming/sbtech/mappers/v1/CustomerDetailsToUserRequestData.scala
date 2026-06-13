package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import net.flipsports.gmx.rewardcalculator.api.UserRequestData
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.sbtech._
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

class CustomerDetailsToUserRequestData(brand: Brand) extends MapFunction[FlinkTuple[CustomerDetailCustomerId, CustomerDetail], FlinkTuple[Long, UserRequestData]] {

  override def map(customer: FlinkTuple[CustomerDetailCustomerId, CustomerDetail]): FlinkTuple[Long, UserRequestData] = {
    val customerId = customer.f1.getCustomerID
    val userEmail = customer.f1.getEmail.replaceFirst("_se_", "").replaceFirst("_to_", "")
    new FlinkTuple(customerId.longValue() ,new UserRequestData(customerId.toString, brand.sourceBrand.uuid, userEmail))
  }

}
