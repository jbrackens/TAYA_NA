package SBTech.Microservices.DataStreaming.DTO.RegistrationUserAbuse.v1

import scala.collection.JavaConverters._

object RegistrationUserAbuseWrapper {
  val javaWrapper = new RegistrationUserAbuseJWrapper()

  def fromJson(json: String): RegistrationUserAbuse = javaWrapper.fromJson(json)

  def fromJsonList(json: String): Seq[RegistrationUserAbuse] = javaWrapper.fromJsonList(json).asScala

  def toJson(value: RegistrationUserAbuse): String = javaWrapper.toJson(value)

}
