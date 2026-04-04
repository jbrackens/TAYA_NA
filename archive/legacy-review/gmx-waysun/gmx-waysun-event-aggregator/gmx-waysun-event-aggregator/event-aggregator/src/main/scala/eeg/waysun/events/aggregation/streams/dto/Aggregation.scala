package eeg.waysun.events.aggregation.streams.dto

case class Aggregation(
    eventDateTime: Long,
    eventName: String,
    projectId: String,
    uuid: String,
    aggregationDefinitionRuleId: String,
    eventDefinitionRuleId: String,
    aggregationFieldName: String,
    aggregationFieldValue: String,
    aggregationFieldType: String,
    aggregationGroupByFieldName: String,
    aggregationGroupByFieldValue: String,
    intervalType: String,
    intervalLength: Int,
    windowStartDateTime: Long,
    windowCountLimit: Option[Long] = None,
    count: Int = 1,
    min: Float = 0.0f,
    max: Float = 0.0f,
    sum: Float = 0.0f,
    custom: String)
    extends Serializable
