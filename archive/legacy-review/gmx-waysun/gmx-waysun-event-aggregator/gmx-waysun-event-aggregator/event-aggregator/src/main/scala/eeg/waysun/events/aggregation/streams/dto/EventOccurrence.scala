package eeg.waysun.events.aggregation.streams.dto

case class EventOccurrence(eventDateTime: Long, eventName: String, uuid: String, fields: Seq[Field])
    extends Serializable
