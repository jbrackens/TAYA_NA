package net.flipsports.gmx.dataapi.internal.notificator.notifications

import scala.collection.JavaConverters._

object NotificationEventWrapper {

  def fromJson(json: String): NotificationEvent = new NotificationEventJWrapper().fromJson(json)

  def fromJsonList(json: String): Seq[NotificationEvent] = new NotificationEventJWrapper().fromJsonList(json).asScala

  def toJson(value: NotificationEvent) = new NotificationEventJWrapper().toJson(value)

}
