package stella.rules.db.event

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.Clock
import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids._

import stella.rules.db.CommonMappers
import stella.rules.db.ExtendedPostgresProfile
import stella.rules.db.ExtendedPostgresProfile.api._
import stella.rules.models.Ids._
import stella.rules.models.Ids._
import stella.rules.models.event
import stella.rules.models.event.EventConfigurationEntity
import stella.rules.models.event.EventFieldEntity
import stella.rules.models.event.FieldValueType
import stella.rules.models.event.http.CreateEventConfigurationRequest

class SlickEventConfigurationRepository(dbConfig: DatabaseConfig[JdbcProfile], clock: Clock)
    extends EventConfigurationRepository
    with CommonMappers
    with SlickSupport {

  import SlickEventConfigurationRepository._
  import dbConfig.db

  // --------------- database definitions ---------------
  override val profile: ExtendedPostgresProfile.type = slickProfile

  // --------------- API ---------------
  override def getEventConfigurations(projectId: ProjectId, includeInactive: Boolean)(implicit
      ec: ExecutionContext): Future[Seq[EventConfigurationEntity]] =
    db.run {
      eventConfigurationsTable
        .filter(_.projectId === projectId)
        .filterIf(!includeInactive)(_.isActive === true)
        .joinLeft(eventFieldsTable)
        .on(_.id === _.eventConfigurationId)
        .result
    }.map(fillInConfigurationFields)

  override def createEventConfigurationAndFields(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      createRequest: CreateEventConfigurationRequest)(implicit ec: ExecutionContext): Future[EventConfigurationEntity] =
    db.run {
      val currentDateTime = clock.currentUtcOffsetDateTime()
      (for {
        config <- eventConfigurationsTable
          .returning(eventConfigurationsTable.map(_.id))
          .into((ec: EventConfigurationEntity, id: EventConfigurationId) => ec.copy(id = id)) +=
          event.EventConfigurationEntity(
            EventConfigurationId(0),
            eventId,
            projectId,
            name = createRequest.name,
            description = createRequest.description.getOrElse(CreateEventConfigurationRequest.defaultDescription),
            fields = Nil,
            isActive = true,
            createdAt = currentDateTime,
            updatedAt = currentDateTime)
        fields <- eventFieldsTable
          .returning(eventFieldsTable.map(_.id))
          .into((ef: EventFieldEntity, id: EventFieldId) => ef.copy(id = id)) ++=
          createRequest.fields.map(field =>
            event.EventFieldEntity(EventFieldId(0), config.id, name = field.name, valueType = field.valueType))
      } yield config.copy(fields = fields.toList)).transactionally
    }

  override def getEventConfiguration(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]] =
    db.run {
      compiledEventConfigWithFieldsQuery((eventId, projectId)).result
    }.map(fillInConfigurationFields)
      .map(_.headOption)

  override def getEventConfigurationWithoutFields(eventId: EventConfigurationEventId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]] =
    db.run {
      compiledEventConfigWithoutFieldsQuery((eventId, projectId)).result.headOption
    }

  override def getEventConfigurationWithoutFieldsById(id: EventConfigurationId, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Option[EventConfigurationEntity]] =
    db.run {
      eventConfigurationsTable.filter(event => event.id === id && event.projectId === projectId).result.headOption
    }

  override def checkIfEventConfigurationExists(eventName: String, projectId: ProjectId)(implicit
      ec: ExecutionContext): Future[Boolean] =
    db.run {
      compiledCheckEventConfigWithNameExistsQuery((eventName, projectId)).result
    }

  override def updateEventConfiguration(
      eventId: EventConfigurationEventId,
      projectId: ProjectId,
      newIsActiveValue: Boolean,
      newDescription: String): Future[Int] =
    db.run {
      compiledUpdateEventConfigQuery((eventId, projectId))
        .update((newIsActiveValue, newDescription, clock.currentUtcOffsetDateTime()))
    }

  override def deleteEventConfigurationAndFields(eventConfig: EventConfigurationEntity)(implicit
      ec: ExecutionContext): Future[Unit] =
    db.run {
      (for {
        _ <- compiledEventFieldsForEventConfigQuery(eventConfig.id).delete
        _ <- compiledEventConfigWithoutFieldsQuery((eventConfig.eventId, eventConfig.projectId)).delete
      } yield ()).transactionally
    }
}

object SlickEventConfigurationRepository extends CommonMappers with SlickSupport {

  override val profile: ExtendedPostgresProfile.type = slickProfile

  type EventConfigRow = (
      EventConfigurationId,
      EventConfigurationEventId,
      ProjectId,
      String,
      String,
      Boolean,
      OffsetDateTime,
      OffsetDateTime)

  private[db] class EventConfigurationTable(tag: Tag)
      extends Table[EventConfigurationEntity](tag, "event_configurations") {

    def id = column[EventConfigurationId]("id", O.PrimaryKey, O.AutoInc)

    def eventId = column[EventConfigurationEventId]("event_id", O.Unique)

    def projectId = column[ProjectId]("project_id")

    def name = column[String]("name")

    def description = column[String]("description")

    def isActive = column[Boolean]("is_active")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    override def * =
      (id, eventId, projectId, name, description, isActive, createdAt, updatedAt).<>(fromTableRow, toTableRow)

    private def fromTableRow(row: EventConfigRow): EventConfigurationEntity = row match {
      case (id, eventId, projectId, name, description, isActive, createdAt, updatedAt) =>
        event.EventConfigurationEntity(
          id = id,
          eventId = eventId,
          projectId = projectId,
          name = name,
          description = description,
          fields = Nil,
          isActive = isActive,
          createdAt = OffsetDateTimeUtils.asUtc(createdAt),
          updatedAt = OffsetDateTimeUtils.asUtc(updatedAt))
    }

    private def toTableRow(eventConfigurationEntity: EventConfigurationEntity): Option[EventConfigRow] =
      Some(
        (
          eventConfigurationEntity.id,
          eventConfigurationEntity.eventId,
          eventConfigurationEntity.projectId,
          eventConfigurationEntity.name,
          eventConfigurationEntity.description,
          eventConfigurationEntity.isActive,
          eventConfigurationEntity.createdAt,
          eventConfigurationEntity.updatedAt))
  }

  private class EventFieldTable(tag: Tag) extends Table[EventFieldEntity](tag, "event_fields") {

    def id = column[EventFieldId]("id", O.PrimaryKey, O.AutoInc)

    def eventConfigurationId = column[EventConfigurationId]("event_configuration_id")

    def name = column[String]("name")

    def valueType = column[FieldValueType]("value_type")

    def eventConfigurationIdFk =
      foreignKey("fk_event_fields_event_configurations_id", eventConfigurationId, eventConfigurationsTable)(_.id)

    override def * = (id, eventConfigurationId, name, valueType).mapTo[EventFieldEntity]
  }

  // --------------- queries ---------------
  private[db] val eventConfigurationsTable = TableQuery[EventConfigurationTable]

  private val eventFieldsTable = TableQuery[EventFieldTable]

  private def eventConfigWithoutFieldsQuery(eventId: Rep[EventConfigurationEventId], projectId: Rep[ProjectId]) =
    eventConfigurationsTable.filter(eventConf => eventConf.projectId === projectId && eventConf.eventId === eventId)

  private val compiledEventConfigWithoutFieldsQuery = Compiled(eventConfigWithoutFieldsQuery _)

  private def eventConfigWithFieldsQuery(eventId: Rep[EventConfigurationEventId], projectId: Rep[ProjectId]) =
    eventConfigWithoutFieldsQuery(eventId, projectId).joinLeft(eventFieldsTable).on(_.id === _.eventConfigurationId)

  private val compiledEventConfigWithFieldsQuery = Compiled(eventConfigWithFieldsQuery _)

  private def eventFieldsForEventConfigQuery(eventConfigId: Rep[EventConfigurationId]) =
    eventFieldsTable.filter(_.eventConfigurationId === eventConfigId)

  private val compiledEventFieldsForEventConfigQuery = Compiled(eventFieldsForEventConfigQuery _)

  private def updateEventConfigQuery(eventId: Rep[EventConfigurationEventId], projectId: Rep[ProjectId]) =
    eventConfigWithoutFieldsQuery(eventId, projectId).map(ece => (ece.isActive, ece.description, ece.updatedAt))

  private val compiledUpdateEventConfigQuery = Compiled(updateEventConfigQuery _)

  private def checkEventConfigWithNameExistsQuery(eventName: Rep[String], projectId: Rep[ProjectId]) =
    eventConfigurationsTable.filter(_.projectId === projectId).filter(_.name === eventName).exists

  private val compiledCheckEventConfigWithNameExistsQuery = Compiled(checkEventConfigWithNameExistsQuery _)

  private def fillInConfigurationFields(
      joinResult: Seq[(EventConfigurationEntity, Option[EventFieldEntity])]): Seq[EventConfigurationEntity] =
    joinResult
      .groupBy { case (ece, _) => ece }
      .map { case (ece, configsAndFieldsTuples) =>
        ece.copy(fields = configsAndFieldsTuples.flatMap { case (_, field) => field }.toList)
      }
      .toSeq
      .sortBy(_.id)
}
