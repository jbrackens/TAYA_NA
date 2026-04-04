package eeg.waysun.events.aggregation.streams.dto

import eeg.waysun.events.aggregation.Types

case class Streams(
    validated: Types.Stream.ValidatedEventsKeyedDataStream,
    aggregationDefinition: Types.Stream.AggregationDefinitionKeyedDataStream,
    aggregationsInProjects: Types.Stream.AggregationInProjectsKeyedDataStream,
    aggregationControl: Types.Stream.AggregationControlKeyedDataStream)
