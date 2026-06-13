package net.flipsports.gmx.streaming.sbtech.mappers.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId}
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

class CustomerDetailsToKeyed extends MapFunction[Tuple2[Long, CustomerDetail], Tuple2[CustomerDetailCustomerId, CustomerDetail]] {

  override def map(customer: Tuple2[Long, CustomerDetail]): Tuple2[CustomerDetailCustomerId, CustomerDetail] = new Tuple2(new CustomerDetailCustomerId(customer.f1.getCustomerID), customer.f1)

}
