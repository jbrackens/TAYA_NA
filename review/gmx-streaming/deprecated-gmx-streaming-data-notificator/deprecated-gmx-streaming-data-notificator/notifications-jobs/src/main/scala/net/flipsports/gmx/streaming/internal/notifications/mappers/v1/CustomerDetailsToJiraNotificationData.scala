package net.flipsports.gmx.streaming.internal.notifications.mappers.v1

import java.time.Instant
import java.util.UUID

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail
import net.flipsports.gmx.dataapi.internal.notificator.notifications.{Jira, JiraTask, NotificationEvent, NotificationType}
import net.flipsports.gmx.streaming.common.business.Brand
import net.flipsports.gmx.streaming.internal.notifications._
import org.apache.flink.api.common.functions.MapFunction
import org.apache.flink.api.java.tuple.Tuple2

import scala.collection.JavaConverters._

class CustomerDetailsToJiraNotificationData(brand: Brand) extends MapFunction[CustomerDetail, Tuple2[String, NotificationEvent]] {

  override def map(customer: CustomerDetail): Tuple2[String, NotificationEvent] = {
    val customerId = customer.getCustomerID
    val notificationEvent = new NotificationEvent()
    notificationEvent.setPayload(jiraTicketEvent(customer))
    notificationEvent.setType(NotificationType.JIRA)
    notificationEvent.setUuid(UUID.randomUUID().toString)
    notificationEvent.setCreatedDate(Instant.now.toEpochMilli)
    new Tuple2(customerId.toString(), notificationEvent)
  }

  def jiraTicketEvent(customer: CustomerDetail) = {
    val jiraTicket = new Jira()
    jiraTicket.setCompanyId(brand.sourceBrand.uuid)
    jiraTicket.setEmail(customer.getEmail.replaceFirst("_se_", ""))
    jiraTicket.setExternalUserId(customer.getCustomerID.toString)
    jiraTicket.setType(JiraTask.IRISH_USER_REGISTRATION)
    jiraTicket.setData(Map[CharSequence, CharSequence]().asJava)
    jiraTicket
  }
}