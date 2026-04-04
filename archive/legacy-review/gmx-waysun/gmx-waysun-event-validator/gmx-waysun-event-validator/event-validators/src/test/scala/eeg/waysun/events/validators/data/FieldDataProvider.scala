package eeg.waysun.events.validators.data

import stella.dataapi.platformevents.Field

object FieldDataProvider {

  def createField(item: String, value: Int): Field = createFieldFor(item, value)
  def createField(item: String, value: String): Field = createFieldFor(item, value)
  def createField(item: String, value: Boolean): Field = createFieldFor(item, value)
  def createField(item: String, value: Float): Field = createFieldFor(item, value)

  def createField(item: String): Field = new Field(item, null)

  private def createFieldFor(item: String, value: Any): Field = new Field(item, value.toString)
}
