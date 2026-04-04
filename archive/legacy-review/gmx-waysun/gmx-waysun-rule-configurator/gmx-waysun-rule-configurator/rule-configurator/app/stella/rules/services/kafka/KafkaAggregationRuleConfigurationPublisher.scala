package stella.rules.services.kafka

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.kafka.KafkaPublicationInfo
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionError
import stella.common.models.Ids.ProjectId
import stella.dataapi.{aggregation => dataapi}

import stella.rules.models.aggregation.http.AggregationRuleConfiguration

class KafkaAggregationRuleConfigurationPublisher(
    kafkaPublicationService: KafkaPublicationService[
      dataapi.AggregationRuleConfigurationKey,
      dataapi.AggregationRuleConfiguration]) {

  def publish(aggregationRuleConfiguration: AggregationRuleConfiguration, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, KafkaPublicationInfo] = {
    val key = new dataapi.AggregationRuleConfigurationKey(
      aggregationRuleConfiguration.aggregationRuleId.toString,
      projectId.toString,
      aggregationRuleConfiguration.name,
      aggregationRuleConfiguration.eventConfigurationId.toString)
    val value = if (aggregationRuleConfiguration.isActive) {
      Some(aggregationRuleConfiguration.toDataApi)
    } else None
    kafkaPublicationService.publish(key, value)
  }
}
