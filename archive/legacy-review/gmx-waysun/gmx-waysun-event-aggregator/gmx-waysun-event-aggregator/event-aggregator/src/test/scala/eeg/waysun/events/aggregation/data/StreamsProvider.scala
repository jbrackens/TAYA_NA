package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.data.DataStreamProvider.{WithTypeInformation => DS}
import eeg.waysun.events.aggregation.data.generators.instances._
import eeg.waysun.events.aggregation.data.generators.instances.instances._
import eeg.waysun.events.aggregation.streams.builders.{
  AggregationControlStreamBuilder,
  AggregationDefinitionStreamBuilder,
  AggregationInProjectsStreamBuilder,
  ValidatedStreamBuilder
}
import eeg.waysun.events.aggregation.streams.dto.{Streams => AggregationStreams}
import eeg.waysun.events.aggregation.{Types, Implicits => I}
import org.apache.flink.streaming.api.scala.StreamExecutionEnvironment

case class StreamsProvider()(implicit
    userId: UserId,
    eventName: EventName,
    eventDefinitionId: EventDefinitionRuleId,
    projectId: ProjectId,
    aggregationRuleId: AggregationRuleId,
    messageId: MessageId,
    scenario: Scenario) {
  def build(implicit env: StreamExecutionEnvironment): AggregationStreams = StreamsProvider.apply(
    validated = new Validated(
      userId = userId,
      eventDefinitionId = eventDefinitionId,
      eventName = eventName,
      projectId = projectId,
      messageId = messageId,
      scenario = scenario).all(1),
    aggregationDefinition = new AggregationDefinition(
      eventName = eventName,
      eventDefinitionId = eventDefinitionId,
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      scenario: Scenario).all(1),
    aggregationControl = new AggregationControl(projectId, aggregationRuleId).all(1))
}

object StreamsProvider {
  def apply(
      validated: Seq[Types.Validated.Source],
      aggregationDefinition: Seq[Types.AggregationDefinition.Source],
      aggregationControl: Seq[Types.AggregationControl.Source])(implicit
      env: StreamExecutionEnvironment): AggregationStreams = {
    val aggregationDefinitions = AggregationDefinitionStreamBuilder.buildTopology(
      DS(aggregationDefinition, I.AggregationDefinitionImplicit.source))
    AggregationStreams(
      validated = ValidatedStreamBuilder.buildTopology(DS(validated, I.ValidatedImplicit.source)),
      aggregationDefinition = aggregationDefinitions,
      aggregationsInProjects = AggregationInProjectsStreamBuilder.build(aggregationDefinitions),
      aggregationControl =
        AggregationControlStreamBuilder.buildTopology(DS(aggregationControl, I.AggregationControlImplicit.source)))
  }
}
