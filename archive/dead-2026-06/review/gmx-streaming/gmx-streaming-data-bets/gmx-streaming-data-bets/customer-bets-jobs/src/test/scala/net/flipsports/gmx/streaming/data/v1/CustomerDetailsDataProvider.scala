package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailCustomerId, CustomerDetailWrapper}
import org.apache.flink.api.java.tuple.{Tuple2 => FlinkTuple}

object CustomerDetailsDataProvider extends DataProvider[FlinkTuple[CustomerDetailCustomerId, CustomerDetail]] {

  val externalUserId = 11272172

  override def sourceFile: String = "customerdetails.json"

  override def fromJson(json: String)= CustomerDetailWrapper.fromJsonList(json)
    .map(el => new FlinkTuple(new CustomerDetailCustomerId(el.getCustomerID), el))
}
