package eeg.waysun.events.aggregation.mappers

case class BooleanValue(value: Boolean) {

  def asInt(): Int = if (value) 1 else 0

}
