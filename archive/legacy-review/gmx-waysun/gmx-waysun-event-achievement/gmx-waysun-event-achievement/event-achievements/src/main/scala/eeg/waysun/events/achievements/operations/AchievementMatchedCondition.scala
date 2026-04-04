package eeg.waysun.events.achievements.operations

trait AchievementMatchedCondition[T] extends Serializable {

  def matchedCondition: Boolean

}
