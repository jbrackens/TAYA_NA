package eeg.waysun.events.validators.validation.validators.event

import stella.dataapi.eventconfigurations.EventConfiguration
import stella.dataapi.platformevents.EventEnvelope
import eeg.waysun.events.validators.validation.{ErrorCodes, EventValidation, ValidationResult}
import org.apache.commons.lang3.StringUtils
import net.flipsports.gmx.streaming.common.conversion.StringOps._

class MessageIdIsNotEmpty extends EventValidation {

  override def validate(eventDefinitionFields: EventConfiguration, eventFields: EventEnvelope): ValidationResult = {
    val eventEnvelopeMessageId: String = eventFields.getMessageId

    if (StringUtils.isNotEmpty(eventEnvelopeMessageId))
      ValidationResult.succeeded()
    else
      ValidationResult.failure(ErrorCodes.EmptyMessageId)
  }

}

object MessageIdIsNotEmpty {

  def apply(): EventValidation = new MessageIdIsNotEmpty
}
