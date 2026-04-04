package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.Types
import eeg.waysun.events.aggregation.Types.EventOccurrence._
import eeg.waysun.events.aggregation.streams.dto.{EventOccurrence, EventOccurrenceId, Field}
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue

object EventOccurrenceProvider {

  def keyType(
      projectId: Types.ProjectId,
      userId: Types.UserId,
      eventId: Types.EventDefinitionRuleId,
      eventName: Types.EventName): Types.EventOccurrence.KeyType =
    EventOccurrenceId(projectId = projectId, userId = userId, eventDefinitionId = eventId, eventName = eventName)

  def valueType(eventDefinitionId: String, fields: Option[Seq[Field]] = None): ValueType =
    EventOccurrence(
      eventDateTime = 1,
      eventName = eventDefinitionId,
      fields = fields.getOrElse(Seq.empty),
      uuid = "uuid")

  def source(
      projectId: Types.ProjectId,
      userId: Types.UserId,
      eventDefinitionId: Types.EventDefinitionRuleId,
      eventName: Types.EventName,
      fields: Option[Seq[Field]] = None): KeyedType = {
    KeyValue.fromTuple(
      (
        keyType(projectId = projectId, userId = userId, eventId = eventDefinitionId, eventName = eventName),
        valueType(eventDefinitionId, fields)))
  }

}
