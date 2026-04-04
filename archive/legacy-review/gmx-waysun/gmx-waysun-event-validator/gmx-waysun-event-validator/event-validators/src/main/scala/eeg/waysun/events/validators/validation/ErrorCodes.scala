package eeg.waysun.events.validators.validation

abstract sealed class ErrorCodes(val code: String, val description: String)

object ErrorCodes {

  case object EmptyPayload extends ErrorCodes("NULL_PAYLOAD", "Payload is empty.")

  case object EmptyMessageId extends ErrorCodes("EMPTY_MESSAGE_ID", "Message id is empty.")

  case object MissedFields extends ErrorCodes("MISSED_FIELDS", "Message not contains defined fields in configuration.")

  case object IncorrectValue extends ErrorCodes("INCORRECT_VALUE", "Message value has failed regexp validation.")

  case object Removed extends ErrorCodes("REMOVED", "Message or definition value has been removed.")

}
