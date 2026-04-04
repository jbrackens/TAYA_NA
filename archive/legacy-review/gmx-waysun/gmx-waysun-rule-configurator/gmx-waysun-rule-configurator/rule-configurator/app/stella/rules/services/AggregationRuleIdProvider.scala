package stella.rules.services

import stella.rules.models.Ids.AggregationRuleConfigurationRuleId

trait AggregationRuleIdProvider {
  def generateId(): AggregationRuleConfigurationRuleId
}

object RandomUuidAggregationRuleIdProvider extends AggregationRuleIdProvider {
  override def generateId(): AggregationRuleConfigurationRuleId = AggregationRuleConfigurationRuleId.random()
}
