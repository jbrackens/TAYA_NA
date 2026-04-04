package SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1

import scala.collection.JavaConverters._

object AbuseIdIdWrapper {
  val javaWrapper = new AbuseIdJWrapper()

  def fromJson(json: String): AbuseId = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[AbuseId] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: AbuseId): String = javaWrapper.toJson(value)

}
