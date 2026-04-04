package eeg.waysun.events.aggregation.streams.dto

import eeg.waysun.events.aggregation.Types._

case class EventOccurrenceId(
    projectId: ProjectId,
    userId: UserId,
    eventDefinitionId: EventDefinitionRuleId,
    eventName: EventName)
    extends Serializable
