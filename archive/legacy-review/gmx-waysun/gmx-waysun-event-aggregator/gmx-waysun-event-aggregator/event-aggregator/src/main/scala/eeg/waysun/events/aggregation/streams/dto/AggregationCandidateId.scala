package eeg.waysun.events.aggregation.streams.dto

import eeg.waysun.events.aggregation.Types._

case class AggregationCandidateId(
    projectId: ProjectId,
    userId: UserId,
    eventDefinitionId: EventDefinitionRuleId,
    eventName: EventName,
    aggregationDefinitionId: AggregationDefinitionRuleId)
    extends Serializable
