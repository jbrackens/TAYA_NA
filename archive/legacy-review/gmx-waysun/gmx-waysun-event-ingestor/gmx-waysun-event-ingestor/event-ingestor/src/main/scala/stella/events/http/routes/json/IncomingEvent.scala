package stella.events.http.routes.json

import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.UUID

import spray.json.DefaultJsonProtocol._
import spray.json.RootJsonFormat
import sttp.tapir.Schema

import stella.common.core.Clock
import stella.common.http.json.JsonFormats.offsetDateTimeFormat
import stella.common.http.json.JsonFormats.uuidFormat
import stella.dataapi.platformevents.EventEnvelope
import stella.dataapi.platformevents.Source

import stella.events.MessageIdProvider
import stella.events.http.routes.json.SourceFormat._

sealed trait BaseEvent {
  def messageOriginDateUTC: OffsetDateTime
  def eventName: String
  def payload: List[Field]

  require(
    messageOriginDateUTC.getOffset == ZoneOffset.UTC,
    s"messageOriginDateUTC `$messageOriginDateUTC` should have zone offset UTC")

}

object BaseEvent {
  private[json] def setBaseEventFieldDescriptions[T <: BaseEvent](schema: Schema[T]): Schema[T] =
    schema.modify(_.eventName)(_.description("An identifier of an event configuration").encodedExample("event_id_1"))
}

final case class IncomingEvent(messageOriginDateUTC: OffsetDateTime, eventName: String, payload: List[Field])
    extends BaseEvent {

  def toEventEnvelope(implicit clock: Clock, messageIdProvider: MessageIdProvider): EventEnvelope = {
    val envelope = new EventEnvelope()
    envelope.setMessageId(messageIdProvider.generateId())
    envelope.setMessageOriginDateUTC(messageOriginDateUTC.toString)
    envelope.setMessageProcessingDateUTC(clock.currentUtcOffsetDateTime().toString)
    envelope.setSource(Source.external)
    envelope.setEventName(eventName)
    // manually to avoid problems with Scala wrapper and kryo serialization
    envelope.setPayload(ScalaToJavaUtils.toJavaList(payload.map(_.toDataApi)))
    envelope
  }
}

object IncomingEvent {
  implicit val incomingEventFormat: RootJsonFormat[IncomingEvent] = jsonFormat3(IncomingEvent.apply)

  implicit val incomingEventSchema: Schema[IncomingEvent] =
    BaseEvent.setBaseEventFieldDescriptions(Schema.derived[IncomingEvent])
}

final case class IncomingAdminEvent(
    messageOriginDateUTC: OffsetDateTime,
    eventName: String,
    payload: List[Field],
    source: Option[Source],
    onBehalfOfProjectId: Option[UUID],
    onBehalfOfUserId: Option[String])
    extends BaseEvent {

  def toEventEnvelope(implicit clock: Clock, messageIdProvider: MessageIdProvider): EventEnvelope = {
    val envelope = new EventEnvelope()
    envelope.setMessageId(messageIdProvider.generateId())
    envelope.setMessageOriginDateUTC(messageOriginDateUTC.toString)
    envelope.setMessageProcessingDateUTC(clock.currentUtcOffsetDateTime().toString)
    envelope.setSource(source.getOrElse(Source.external))
    envelope.setEventName(eventName)
    // manually to avoid problems with Scala wrapper and kryo serialization
    envelope.setPayload(ScalaToJavaUtils.toJavaList(payload.map(_.toDataApi)))
    envelope
  }
}

object IncomingAdminEvent {
  implicit val incomingAdminEventFormat: RootJsonFormat[IncomingAdminEvent] = jsonFormat6(IncomingAdminEvent.apply)

  implicit val incomingAdminEventSchema: Schema[IncomingAdminEvent] = {
    val schema =
      Schema.derived[IncomingAdminEvent].modify(_.source)(_.default(Some(Source.external), Some(Source.external)))
    BaseEvent.setBaseEventFieldDescriptions(schema)
  }
}
