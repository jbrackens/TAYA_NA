package eeg.waysun.events.aggregation.streams

object StepNames {

  // sources
  val aggregationControlSource = "aggregation-control"

  val aggregationDefinitionSource = "aggregation-definition"

  val eventDefinitionSource = "definition-events"

  val validatedSource = "events-validated"

  // stream steps
  val streamAggregationControlSource = "eeg-streaming.aggregation-control"

  val streamEventDefinitionsSource = "eeg-streaming.events-definition"

  val streamAggregationDefinitionSource = "eeg-streaming.aggregation-definition"

  val streamValidatedSource = "eeg-streaming.events-validated"
}
