package eeg.waysun.events.aggregation.mappers

import stella.dataapi.validators.FieldType
import eeg.waysun.events.aggregation.functions.FieldTypeExtractor
import eeg.waysun.events.aggregation.streams.dto.Field

case class FieldValue(field: Field) extends Serializable {

  val fieldType = FieldTypeExtractor.apply(field.fieldType)

  val fieldValue = field.value

  def asFloat: Float = fieldType match {
    case FieldType.Integer => fieldValue.toFloat
    case FieldType.Boolean => BooleanValue(fieldValue.toLowerCase.toBoolean).asInt().toFloat
    case FieldType.Float   => fieldValue.toFloat
    case FieldType.String  => StringValue(fieldValue).toFloat()
  }

  def asString: String = fieldType match {
    case FieldType.Boolean => BooleanValue(fieldValue.toLowerCase.toBoolean).asInt().toString
    case FieldType.Integer => fieldValue
    case FieldType.Float   => fieldValue
    case FieldType.String  => fieldValue
  }

}
