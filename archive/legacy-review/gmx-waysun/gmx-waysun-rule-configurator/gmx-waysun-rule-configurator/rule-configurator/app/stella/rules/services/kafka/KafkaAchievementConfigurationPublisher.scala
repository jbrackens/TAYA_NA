package stella.rules.services.kafka

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.data.EitherT

import stella.common.kafka.KafkaPublicationInfo
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionError
import stella.common.models.Ids.ProjectId
import stella.dataapi.achievement.AchievementConfigurationKey
import stella.dataapi.{achievement => dataapi}

import stella.rules.models.achievement.http.AchievementRuleConfiguration

class KafkaAchievementConfigurationPublisher(
    kafkaPublicationService: KafkaPublicationService[
      dataapi.AchievementConfigurationKey,
      dataapi.AchievementConfiguration]) {

  def publish(achievementConfiguration: AchievementRuleConfiguration, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, KafkaPublicationInfo] = {
    val key = new AchievementConfigurationKey(achievementConfiguration.achievementRuleId.toString, projectId.toString)
    val value = if (achievementConfiguration.isActive) {
      Some(achievementConfiguration.toDataApiAchievementConfiguration)
    } else None
    kafkaPublicationService.publish(key, value)
  }
}
