package eeg.waysun.events.aggregation.data

import eeg.waysun.events.aggregation.Types
import net.flipsports.gmx.streaming.common.job.streams.dto.KeyValue
import stella.dataapi.platformevents.{EventKey, FieldTyped, ValidatedEventEnvelope, Source => GivenSource}

import scala.collection.JavaConverters.seqAsJavaList

object ValidatedProvider {
  case class Parameters(
      projectId: String,
      userId: String,
      messageId: Option[String] = None,
      eventName: Option[String] = None,
      messageOriginDateUTC: Option[String] = None,
      messageProcessingDateUTC: Option[String] = None,
      source: Option[GivenSource] = None,
      fields: Option[Seq[FieldTyped]] = None)
  import Types.Validated._
  def key(parameters: Parameters): KeyType = {
    import parameters._
    new EventKey(userId, projectId)
  }

  def value(parameters: Parameters): ValueType = {
    import parameters.{source => givenSource, _}
    ValidatedEventEnvelope
      .newBuilder()
      .setMessageId(messageId.getOrElse("messageId"))
      .setEventName(eventName.getOrElse("messageType"))
      .setPayload(seqAsJavaList(fields.getOrElse(Seq())))
      .setMessageOriginDateUTC(messageOriginDateUTC.getOrElse(""))
      .setMessageProcessingDateUTC(messageProcessingDateUTC.getOrElse(""))
      .setSource(givenSource.getOrElse(GivenSource.external))
      .build()
  }

  def keyed(parameters: Parameters): KeyedType = KeyValue.fromTuple((key(parameters), value(parameters)))

}
