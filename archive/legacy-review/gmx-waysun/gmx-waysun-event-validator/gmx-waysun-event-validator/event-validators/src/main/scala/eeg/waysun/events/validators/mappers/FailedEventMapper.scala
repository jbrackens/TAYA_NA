package eeg.waysun.events.validators.mappers
import stella.dataapi.platformevents.EventKey
import eeg.waysun.events.validators.Types
import org.apache.flink.api.common.functions.MapFunction

import scala.collection.JavaConverters._

class FailedEventMapper extends MapFunction[Types.ValidationFailed.Source, Types.Failed.Source] {
  override def map(event: Types.ValidationFailed.Source): Types.Failed.Source = {
    val failedEvent = transformValue(event)
    new Types.Failed.Source(new EventKey(event.f0.projectId, event.f0.userId), failedEvent)
  }

  def transformValue(event: Types.ValidationFailed.Source): Types.Failed.ValueType = {
    val failedEvent = new Types.Failed.ValueType()
    val failedValidationMethods = transformFailedValidationErrors(event.f1)
    failedEvent.setFailedValidation(failedValidationMethods.asJava)
    failedEvent.setEventEnvelope(event.f1.raw)
    failedEvent
  }

  def transformFailedValidationErrors(
      record: Types.ValidationFailed.ValueType): List[Types.ValidationFailedMethods.ValueType] = {
    record.errorCodes.map { item =>
      val methodsFailed = new Types.ValidationFailedMethods.ValueType()
      methodsFailed.setValidationName(item.code)
      methodsFailed.setDescription(item.description)
      methodsFailed
    }.toList
  }

}

object FailedEventMapper {

  def apply(): MapFunction[Types.ValidationFailed.Source, Types.Failed.Source] = new FailedEventMapper()
}
