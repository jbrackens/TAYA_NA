package net.flipsports.gmx.streaming.data.v1

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.{CustomerDetail, CustomerDetailWrapper}

object CustomerDetailsDataProvider extends DataProvider[CustomerDetail] {

  val externalUserId = 11272172

  override def sourceFile: String = "customerdetails.json"

  override def fromJson(json: String)= CustomerDetailWrapper.fromJsonList(json)
}
