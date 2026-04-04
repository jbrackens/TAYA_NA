package eeg.waysun.events.validators.data

import stella.dataapi.eventconfigurations.EventField
import stella.dataapi.validators.FieldType

object EventFieldDataProvider {

  def intField(item: String): EventField = new EventField(item, FieldType.Integer.name)

  def stringField(item: String): EventField = new EventField(item, FieldType.String.name)

  def booleanField(item: String): EventField = new EventField(item, FieldType.Boolean.name)

  def floatField(item: String): EventField = new EventField(item, FieldType.Float.name)
}
