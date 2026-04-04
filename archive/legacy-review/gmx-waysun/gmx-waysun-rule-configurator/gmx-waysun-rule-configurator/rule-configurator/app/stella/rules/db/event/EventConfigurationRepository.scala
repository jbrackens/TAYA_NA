package stella.rules.db.event

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import stella.common.models.Ids.ProjectId

import stella.rules.models.Ids.EventConfigurationEventId
import stella.rules.models.Ids.EventConfigurationId
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.http.CreateEventConfigurationRequest

trait EventConfigurationRepository {

  def getEventConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[EventConfigurationEntity]]

  def createEventConfigurationAndFields(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      createRequest: CreateEventConfigurationRequest)(implicit ec: ExecutionContext): Future[EventConfigurationEntity]

  def getEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]]

  def getEventConfigurationWithoutFields(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]]

  def getEventConfigurationWithoutFieldsById(id: EventConfigurationId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]]

  def checkIfEventConfigurationExists(eventName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean]

  def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int]

  def deleteEventConfigurationAndFields(eventConfig: EventConfigurationEntity)(implicit
      ec: ExecutionContext): Future[Unit]
}
