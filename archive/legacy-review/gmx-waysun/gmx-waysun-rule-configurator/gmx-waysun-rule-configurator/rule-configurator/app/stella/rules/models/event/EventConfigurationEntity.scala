package stella.rules.models.event

import java.time.OffsetDateTime

import stella.common.models.Ids._

import stella.rules.models.Ids._
import stella.rules.models.event.http.EventConfiguration

final case class EventConfigurationEntity(
    id: EventConfigurationId,
    eventId: EventConfigurationEventId,
    projectId: ProjectId,
    name: String,
    description: String,
    fields: List[EventFieldEntity],
    isActive: Boolean,
    createdAt: OffsetDateTime,
    updatedAt: OffsetDateTime) {

  def toEventConfiguration: EventConfiguration =
    http.EventConfiguration(eventId, name, description, fields.map(_.toEventField), isActive, createdAt, updatedAt)
}
