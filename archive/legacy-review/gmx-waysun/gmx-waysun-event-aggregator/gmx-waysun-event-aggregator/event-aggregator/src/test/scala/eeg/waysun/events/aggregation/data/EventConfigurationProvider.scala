package eeg.waysun.events.aggregation.data

object EventConfigurationProvider {

  val sampleFields = Seq((Fields.killsName, Fields.killsValueType), (Fields.amountName, Fields.amountValueType))

  def eventId(item: Int): String = s"event-$item"
}
