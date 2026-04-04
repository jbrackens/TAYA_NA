package stella.rules.routes.error

import ca.mrvisser.sealerate

import stella.common.http.error.PresentationErrorCode

sealed trait AdditionalPresentationErrorCode extends PresentationErrorCode

object AdditionalPresentationErrorCode {
  val values: Set[AdditionalPresentationErrorCode] = sealerate.values[AdditionalPresentationErrorCode]

  case object EventConfigurationIsActive extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigIsActive"
  }

  case object EventConfigurationIsInUse extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigIsInUse"
  }

  case object EventConfigurationNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigNotFound"
  }

  case object EventConfigurationFieldNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigFieldNotFound"
  }

  case object EventConfigurationFieldNotProvided extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigFieldNotProvided"
  }

  case object EventConfigurationNameAlreadyUsed extends AdditionalPresentationErrorCode {
    override val value: String = "eventConfigNameAlreadyUsed"
  }

  case object AggregationRuleConfigurationIsActive extends AdditionalPresentationErrorCode {
    override val value: String = "aggregationRuleConfigIsActive"
  }

  case object AggregationRuleConfigurationIsInUse extends AdditionalPresentationErrorCode {
    override val value: String = "aggregationRuleConfigIsInUse"
  }

  case object AggregationRuleConfigurationNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "aggregationRuleConfigNotFound"
  }

  case object AggregationRuleConfigurationNameAlreadyUsed extends AdditionalPresentationErrorCode {
    override val value: String = "aggregationRuleConfigNameAlreadyUsed"
  }

  case object AchievementRuleConfigurationNotFound extends AdditionalPresentationErrorCode {
    override val value: String = "achievementRuleConfigNotFound"
  }

  case object AchievementRuleConfigurationIsActive extends AdditionalPresentationErrorCode {
    override val value: String = "achievementRuleConfigIsActive"
  }

  case object AchievementRuleConfigurationNameAlreadyUsed extends AdditionalPresentationErrorCode {
    override val value: String = "achievementRuleConfigNameAlreadyUsed"
  }
}
