package stella.rules.services.kafka

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

import cats.data.EitherT

import stella.common.kafka.KafkaPublicationInfo
import stella.common.kafka.KafkaPublicationService
import stella.common.kafka.KafkaPublicationServiceImpl.EventSubmissionError
import stella.common.models.Ids.ProjectId
import stella.dataapi.{eventconfigurations => dataapi}

import stella.rules.models.event.http.EventConfiguration

class KafkaEventConfigurationPublisher(
    kafkaPublicationService: KafkaPublicationService[dataapi.EventConfigurationKey, dataapi.EventConfiguration]) {

  def publish(eventConfiguration: EventConfiguration, projectId: ProjectId)(implicit
      ec: ExecutionContext): EitherT[Future, EventSubmissionError, KafkaPublicationInfo] = {
    val key = new dataapi.EventConfigurationKey(
      eventConfiguration.eventId.toString,
      projectId.toString,
      eventConfiguration.name)
    val value = if (eventConfiguration.isActive) {
      val configuration = new dataapi.EventConfiguration()
      configuration.setFields(eventConfiguration.fields.map(_.toDataApi).asJava)
      Some(configuration)
    } else None
    kafkaPublicationService.publish(key, value)
  }
}
