package stella.rules.models.event.http

import java.time.OffsetDateTime

import play.api.libs.json.Json
import play.api.libs.json.OFormat
import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.dataapi.{eventconfigurations => dataapi}

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationEventId._
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.CreateEventConfigurationRequest._
import stella.rules.models.event.http.EventField.validateEventField

final case class CreateEventConfigurationRequest(name: String, description: Option[String], fields: List[EventField]) {
  require(
    eventConfigNameRegex.matches(name),
    s"Event configuration name must have length 1–$maxEventConfigNameLength and contain only $eventConfigNameAllowedCharacters characters, but it was $name")

  require(
    fields.map(_.name).distinct.length == fields.length,
    "Event configuration can't contain multiple fields with the same name")
}

object CreateEventConfigurationRequest {
  val defaultDescription = ""

  private val eventConfigNameAllowedCharacters = "a-z0-9.-"
  private val maxEventConfigNameLength = 50
  private val eventConfigNameRegex = s"[$eventConfigNameAllowedCharacters]{1,$maxEventConfigNameLength}".r

  implicit lazy val createEventConfigurationRequestFormat: RootJsonFormat[CreateEventConfigurationRequest] =
    jsonFormat3(CreateEventConfigurationRequest.apply)

  implicit lazy val createEventConfigurationRequestPlayFormat: OFormat[CreateEventConfigurationRequest] =
    Json.format[CreateEventConfigurationRequest]

  implicit lazy val createEventConfigurationRequestSchema: Schema[CreateEventConfigurationRequest] =
    Schema
      .derived[CreateEventConfigurationRequest]
      .modify(_.name)(_.description(
        s"A display name between 1 and $maxEventConfigNameLength of such characters: $eventConfigNameAllowedCharacters"))
      .modify(_.description)(_.description("When not specified, an empty String is used"))
}

final case class UpdateEventConfigurationRequest(isActive: Option[Boolean], description: Option[String]) {
  require(isActive.nonEmpty || description.nonEmpty, "No data to update specified")

  def containsChanges(eventConfigEntity: EventConfigurationEntity): Boolean =
    isActive.exists(_ != eventConfigEntity.isActive) || description.exists(_ != eventConfigEntity.description)
}

object UpdateEventConfigurationRequest {
  implicit lazy val updateEventConfigurationRequestFormat: RootJsonFormat[UpdateEventConfigurationRequest] =
    jsonFormat2(UpdateEventConfigurationRequest.apply)

  implicit lazy val updateEventConfigurationRequestPlayFormat: OFormat[UpdateEventConfigurationRequest] =
    Json.format[UpdateEventConfigurationRequest]

  implicit lazy val updateEventConfigurationRequestSchema: Schema[UpdateEventConfigurationRequest] =
    Schema
      .derived[UpdateEventConfigurationRequest]
      .modify(_.isActive)(_.description("New isActive value"))
      .modify(_.description)(_.description("New description value"))
}

final case class EventConfiguration(
    eventId: EventConfigurationEventId,
    name: String,
    description: String,
    fields: List[EventField],
    isActive: Boolean,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime)

object EventConfiguration {

  implicit lazy val eventConfigurationFormat: RootJsonFormat[EventConfiguration] = jsonFormat7(EventConfiguration.apply)

  implicit lazy val eventConfigurationSchema: Schema[EventConfiguration] = {
    // Magnolia can't find this implicit so we need to help a compiler a bit
    Schema.derived[EventConfiguration]
  }
}

final case class EventField(name: String, valueType: FieldValueType) {
  validateEventField("Event field name", name)

  def toDataApi: dataapi.EventField =
    dataapi.EventField.newBuilder().setName(name).setValueType(valueType.toString).build()
}

object EventField {
  val maxEventFieldNameLength = 250
  val eventFieldNameRegex = """^[a-zA-Z][a-zA-Z0-9_]*((\.[a-zA-Z_])|[a-zA-Z0-9_])*$""".r

  val eventFieldDescription =
    s"A non-empty event field name not longer than $maxEventFieldNameLength characters, matching regex ${eventFieldNameRegex.regex} "

  val optionalEventFieldDescription =
    s"If set, a non-empty event field name not longer than $maxEventFieldNameLength characters, matching regex ${eventFieldNameRegex.regex} "

  implicit lazy val eventFieldFormat: RootJsonFormat[EventField] = jsonFormat2(EventField.apply)

  implicit lazy val eventFieldPlayFormat: OFormat[EventField] = Json.format[EventField]

  implicit lazy val eventFieldSchema: Schema[EventField] =
    Schema.derived[EventField].modify(_.name)(_.description(eventFieldDescription).encodedExample("is_new_player"))

  def validateEventField(fieldNameParamName: String, fieldNameValue: String): Unit = {
    require(
      fieldNameValue.length <= maxEventFieldNameLength &&
      eventFieldNameRegex.matches(fieldNameValue),
      s"$fieldNameParamName '$fieldNameValue' must match pattern ${eventFieldNameRegex.regex} and be not longer than $maxEventFieldNameLength characters")
  }
}
