package eeg.waysun.events.aggregation.functions

import stella.dataapi.validators.FieldType

object FieldTypeExtractor {

  def apply(name: String): FieldType = FieldType.values.find(_.name.equalsIgnoreCase(name)).head

}
