package net.flipsports.gmx.streaming.internal.customers.operation.data.v1

import java.time.Instant

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetailWrapper
import net.flipsports.gmx.streaming.internal.customers.operation.Types
import net.flipsports.gmx.streaming.internal.customers.operation.Types.CustomerDetail
import org.apache.flink.api.java.tuple.Tuple2


class CustomerDetailsDataProvider(source: String) extends DataProvider[Types.CustomerDetail.Source] {

  val externalUserId = 11272172

  override def sourceFile: String = source

  override def fromJson(json: String): Seq[Types.CustomerDetail.Source] = CustomerDetailWrapper.fromJsonList(json).map(i => new Tuple2(new CustomerDetail.KeyType(i.getCustomerID), i))

}

object CustomerDetailsDataProvider {

  def apply() = applyOrDefault(None)

  def apply(source: String) = applyOrDefault(Some(source))

  def applyOrDefault(source: Option[String]) = new  CustomerDetailsDataProvider(source.getOrElse("customerdetails.json"))

  def asScalaAllByCreationDate(source: Option[String] = None) = apply(source.getOrElse("customerdetails.json")).all.map(element => (element.f0, element.f1)).sortBy(_._2.getMessageCreationDate)

  def asScalaAllWithCurrentRegistration(source: Option[String] = None) = asScalaAllByCreationDate(source: Option[String]).map(t => {
    t._2.setRegistrationDate(Instant.now().toEpochMilli)
    t
  })

}