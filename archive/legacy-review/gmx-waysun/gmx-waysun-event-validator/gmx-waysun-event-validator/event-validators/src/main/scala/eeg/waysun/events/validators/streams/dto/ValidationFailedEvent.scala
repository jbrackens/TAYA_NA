package eeg.waysun.events.validators.streams.dto

import eeg.waysun.events.validators.Types
import eeg.waysun.events.validators.validation.ErrorCodes

case class ValidationFailedEvent(raw: Types.Raw.ValueType, errorCodes: Seq[ErrorCodes])
