package eeg.waysun.events.achievements.streams.dto

import eeg.waysun.events.achievements.Types

case class Streams(
    aggregationEvent: Types.StreamType.AggregateStream,
    definition: Types.StreamType.AchievementDefinitionStream)
    extends Serializable
