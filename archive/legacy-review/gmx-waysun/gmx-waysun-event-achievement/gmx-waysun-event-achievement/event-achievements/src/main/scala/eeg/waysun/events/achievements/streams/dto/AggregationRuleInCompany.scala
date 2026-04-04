package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types

final case class AggregationRuleInCompany(
    projectId: Types.Ids.ProjectId,
    aggregationRuleId: Types.Ids.AggregationRuleId)
