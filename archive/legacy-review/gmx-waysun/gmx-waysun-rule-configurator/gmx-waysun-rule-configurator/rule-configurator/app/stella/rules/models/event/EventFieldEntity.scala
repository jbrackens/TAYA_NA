package stella.rules.models.event

import enumeratum.Enum
import enumeratum.EnumEntry
import enumeratum.EnumEntry.Lowercase
import enumeratum.PlayJsonEnum
import pl.iterators.kebs.json.KebsEnumFormats.jsonEnumFormat
import spray.json.JsonFormat
import sttp.tapir.codec.enumeratum.TapirCodecEnumeratum

import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.Ids.EventFieldId
import stella.rules.models.event.http.EventField

final case class EventFieldEntity(
    id: EventFieldId,
    eventConfigurationId: EventConfigurationId,
    name: String,
    valueType: FieldValueType) {
  def toEventField: EventField = http.EventField(name, valueType)
}

sealed trait FieldValueType extends EnumEntry with Lowercase with TapirCodecEnumeratum

object FieldValueType extends Enum[FieldValueType] with PlayJsonEnum[FieldValueType] {
  def values: IndexedSeq[FieldValueType] = findValues

  case object Boolean extends FieldValueType
  case object String extends FieldValueType
  case object Integer extends FieldValueType
  case object Float extends FieldValueType

  implicit lazy val fieldValueTypeFormat: JsonFormat[FieldValueType] = jsonEnumFormat
}
