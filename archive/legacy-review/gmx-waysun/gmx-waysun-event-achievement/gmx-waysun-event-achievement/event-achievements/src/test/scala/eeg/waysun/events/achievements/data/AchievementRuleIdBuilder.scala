package eeg.waysun.events.achievements.data

final case class AchievementRuleIdBuilder(idx: Int = 0) {

  def id(): String = s"achievement-rule-id-$idx"

  def next(): AchievementRuleIdBuilder = this.copy(idx + 1)
}
