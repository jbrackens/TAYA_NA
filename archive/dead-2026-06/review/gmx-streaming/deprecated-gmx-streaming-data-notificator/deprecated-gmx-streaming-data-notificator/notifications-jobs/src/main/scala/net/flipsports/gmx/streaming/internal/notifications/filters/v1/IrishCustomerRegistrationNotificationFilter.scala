package net.flipsports.gmx.streaming.internal.notifications.filters.v1

import java.time.Instant
import java.time.temporal.ChronoUnit

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import net.flipsports.gmx.dataapi.internal.notificator.notifications.NotificationEvent
import net.flipsports.gmx.streaming.common.job.filters.InputOutputFilter
import net.flipsports.gmx.streaming.internal.notifications.filters.v1.IrishCustomerRegistrationNotificationFilter._
import org.apache.flink.api.common.functions.FilterFunction
import org.apache.flink.api.java.tuple.Tuple2
class IrishCustomerRegistrationNotificationFilter[R] extends InputOutputFilter[CustomerDetail, Tuple2[String, NotificationEvent]]{

  def input: FilterFunction[CustomerDetail] =  customer => isIrishCustomer(customer) && registrationIsBefore(customer)

  def output: FilterFunction[Tuple2[String, NotificationEvent]] = new InputOutputFilter.TrueFilter

}

object IrishCustomerRegistrationNotificationFilter {

  val retentionHours = 12

  def isIrishCustomer(customerDetail: CustomerDetail): Boolean = "IE".equalsIgnoreCase(customerDetail.getCountryCode.toString)

  def registrationIsBefore(customerDetail: CustomerDetail): Boolean = {
    val retention = Instant.now().minus(retentionHours, ChronoUnit.HOURS)
    Instant.ofEpochMilli(customerDetail.getRegistrationDate).isAfter(retention)
  }

}
