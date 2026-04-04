package eeg.waysun.events.achievements.conditions

import stella.dataapi.achievement.AchievementTriggerBehaviour
import eeg.waysun.events.achievements.Types.AchievementStateType

case class AchievementFiringPolicyCheck(achievementState: AchievementStateType.ValueType) extends Check {

  val collectedAchievementStateFired = achievementState.fired

  override def check: Boolean = achievementState.definition.triggerBehaviour match {
    case AchievementTriggerBehaviour.ALWAYS    => true
    case AchievementTriggerBehaviour.ONLY_ONCE => !collectedAchievementStateFired
  }

}
