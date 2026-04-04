package eeg.waysun.events.achievements.data

final case class AggregationRuleIdBuilder(idx: Int = 0) {

  def id(): String = s"rule-id-$idx"

  def next(): AggregationRuleIdBuilder = this.copy(idx + 1)
}
