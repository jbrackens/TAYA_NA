package eeg.waysun.events.achievements.conditions

import stella.dataapi.achievement.AchievementTriggerBehaviour
import eeg.waysun.events.achievements.Types.AchievementStateType
import eeg.waysun.events.achievements.data.OperationHelper.initializeConfiguration
import eeg.waysun.events.achievements.data._
import net.flipsports.gmx.streaming.tests.StreamingTestBase
import org.scalatest.MustMatchers.convertToAnyMustWrapper

class AchievementFiringPolicyCheckSpec extends StreamingTestBase {

  "Achievement firing policy" should {
    val (projectId, aggregationRuleBuilder, aggregationGroupByFieldBuilder, achievementRuleIdBuilder) =
      initializeConfiguration()

    "be fired on only once" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event", policy = AchievementTriggerBehaviour.ONLY_ONCE)

      val achievementState: AchievementStateType.ValueType =
        new AchievementStateType.ValueType(definitionKey = definition._1, definition = definition._2)

      // when
      val result = AchievementFiringPolicyCheck(achievementState).check

      // then
      result mustBe true
    }

    "be not fired on only once" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event", policy = AchievementTriggerBehaviour.ONLY_ONCE)

      val achievementState: AchievementStateType.ValueType =
        new AchievementStateType.ValueType(fired = true, definitionKey = definition._1, definition = definition._2)

      // when
      val result = AchievementFiringPolicyCheck(achievementState).check

      // then
      result mustBe false
    }

    "be fired on fired true" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event", policy = AchievementTriggerBehaviour.ALWAYS)

      val achievementState: AchievementStateType.ValueType =
        new AchievementStateType.ValueType(fired = true, definitionKey = definition._1, definition = definition._2)

      // when
      val result = AchievementFiringPolicyCheck(achievementState).check

      // then
      result mustBe true
    }

    "be fired on fired false" in {
      // given
      val definition = AchievementDefinitionBuilder(
        projectId,
        achievementRuleIdBuilder,
        aggregationRuleBuilder,
        aggregationGroupByFieldBuilder).build("sample-event", policy = AchievementTriggerBehaviour.ALWAYS)

      val achievementState: AchievementStateType.ValueType =
        new AchievementStateType.ValueType(fired = false, definitionKey = definition._1, definition = definition._2)

      // when
      val result = AchievementFiringPolicyCheck(achievementState).check

      // then
      result mustBe true
    }
  }
}
