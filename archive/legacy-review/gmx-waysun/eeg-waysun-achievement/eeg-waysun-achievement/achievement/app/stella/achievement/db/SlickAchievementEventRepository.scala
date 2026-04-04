package stella.achievement.db

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import cats.implicits.toTraverseOps
import com.softwaremill.quicklens._
import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.OffsetDateTimeUtils
import stella.common.http.AggregationWindow
import stella.common.models.Ids.ProjectId

import stella.achievement.db.ExtendedPostgresProfile.api._
import stella.achievement.db.SlickAchievementEventRepository.AchievementEventRow
import stella.achievement.models
import stella.achievement.models.AchievementEventDetailsEntity
import stella.achievement.models.AchievementEventDetailsEntityWithFields
import stella.achievement.models.AchievementEventDetailsFieldEntity
import stella.achievement.models.AchievementEventEntity
import stella.achievement.models.AchievementEventEntityWithActionDetails
import stella.achievement.models.AchievementWebhookDetailsEntity
import stella.achievement.models.AchievementWebhookDetailsEntityWithFields
import stella.achievement.models.AchievementWebhookDetailsFieldEntity
import stella.achievement.models.ActionType
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.FieldValueType
import stella.achievement.models.Ids._
import stella.achievement.models.OrderByDirection
import stella.achievement.models.OrderByDirection.Asc
import stella.achievement.models.OrderByDirection.Desc
import stella.achievement.models.OrderByFilter
import stella.achievement.models.OrderByFilters
import stella.achievement.models.OrderByType
import stella.achievement.models.OrderByType.FieldValue
import stella.achievement.models.RequestType

class SlickAchievementEventRepository(dbConfig: DatabaseConfig[JdbcProfile])
    extends AchievementEventRepository
    with CommonMappers
    with SlickSupport {

  import dbConfig._

  override val profile: ExtendedPostgresProfile.type = slickProfile

  private class AchievementEventTable(tag: Tag) extends Table[AchievementEventEntity](tag, "achievement_events") {
    def id = column[AchievementEventId]("id", O.PrimaryKey, O.AutoInc)
    def projectId = column[ProjectId]("project_id")
    def achievementRuleId = column[AchievementConfigurationRulePublicId]("achievement_rule_id")
    def achievementOriginDate = column[OffsetDateTime]("achievement_origin_date")
    def groupByFieldValue = column[String]("group_by_field_value")
    def actionType = column[ActionType]("action_type")
    def windowRangeStart = column[Option[OffsetDateTime]]("window_range_start")
    def windowRangeEnd = column[Option[OffsetDateTime]]("window_range_end")
    def achievementEventDetailsId =
      column[Option[AchievementEventDetailsId]]("achievement_event_details_id")
    def achievementWebhookDetailsId =
      column[Option[AchievementWebhookDetailsId]]("achievement_webhook_details_id")
    def createdAt = column[OffsetDateTime]("created_at")

    def * =
      (
        id,
        projectId,
        achievementRuleId,
        achievementOriginDate,
        groupByFieldValue,
        actionType,
        windowRangeStart,
        windowRangeEnd,
        achievementEventDetailsId,
        achievementWebhookDetailsId,
        createdAt).<>(fromTableRow, AchievementEventEntity.unapply)
  }

  def fromTableRow(row: AchievementEventRow): AchievementEventEntity = row match {
    case (
          id,
          projectId,
          achievementRuleId,
          achievementOriginDate,
          groupByFieldValue,
          actionType,
          windowRangeStart,
          windowRangeEnd,
          achievementEventDetailsId,
          achievementWebhookDetailsId,
          createdAt) =>
      models.AchievementEventEntity(
        id = id,
        projectId = projectId,
        achievementRuleId = achievementRuleId,
        achievementOriginDate = OffsetDateTimeUtils.asUtc(achievementOriginDate),
        groupByFieldValue = groupByFieldValue,
        actionType = actionType,
        windowRangeStart = windowRangeStart.map(OffsetDateTimeUtils.asUtc),
        windowRangeEnd = windowRangeEnd.map(OffsetDateTimeUtils.asUtc),
        achievementEventDetailsId = achievementEventDetailsId,
        achievementWebhookDetailsId = achievementWebhookDetailsId,
        createdAt = OffsetDateTimeUtils.asUtc(createdAt))
  }

  private class AchievementEventConfigurationTable(tag: Tag)
      extends Table[AchievementEventDetailsEntity](tag, "achievement_event_details") {
    def id = column[AchievementEventDetailsId]("id", O.PrimaryKey, O.AutoInc)
    def eventDetailsId = column[EventConfigurationPublicId]("event_configuration_id")
    def createdAt = column[OffsetDateTime]("created_at")

    def * =
      (id, eventDetailsId, createdAt).mapTo[AchievementEventDetailsEntity]
  }

  private class AchievementEventDetailsFieldTable(tag: Tag)
      extends Table[AchievementEventDetailsFieldEntity](tag, "achievement_event_details_fields") {
    def id = column[AchievementEventDetailsFieldId]("id", O.PrimaryKey, O.AutoInc)
    def achievementEventDetailsId = column[AchievementEventDetailsId]("achievement_event_details_id")
    def fieldName = column[String]("field_name")
    def valueType = column[FieldValueType]("value_type")
    def value = column[String]("value")
    def createdAt = column[OffsetDateTime]("created_at")

    def * =
      (id, achievementEventDetailsId, fieldName, valueType, value, createdAt).mapTo[AchievementEventDetailsFieldEntity]
  }

  private class AchievementWebhookDetailsTable(tag: Tag)
      extends Table[AchievementWebhookDetailsEntity](tag, "achievement_webhook_details") {
    def id = column[AchievementWebhookDetailsId]("id", O.PrimaryKey, O.AutoInc)
    def eventDetailsId = column[Option[EventConfigurationPublicId]]("event_configuration_id")
    def requestType = column[RequestType]("request_type")
    def url = column[String]("url")
    def createdAt = column[OffsetDateTime]("created_at")

    def * = (id, eventDetailsId, requestType, url, createdAt).mapTo[AchievementWebhookDetailsEntity]
  }

  private class AchievementWebhookDetailsFieldTable(tag: Tag)
      extends Table[AchievementWebhookDetailsFieldEntity](tag, "achievement_webhook_details_fields") {
    def id = column[AchievementWebhookDetailsFieldId]("id", O.PrimaryKey, O.AutoInc)
    def achievementWebhookDetailsId =
      column[AchievementWebhookDetailsId]("achievement_webhook_details_id")
    def fieldName = column[String]("field_name")
    def valueType = column[FieldValueType]("value_type")
    def value = column[String]("value")
    def createdAt = column[OffsetDateTime]("created_at")

    def * = (id, achievementWebhookDetailsId, fieldName, valueType, value, createdAt)
      .mapTo[AchievementWebhookDetailsFieldEntity]
  }

  private val achievementEventTable = TableQuery[AchievementEventTable]
  private val achievementEventDetailsTable = TableQuery[AchievementEventConfigurationTable]
  private val achievementEventDetailsFieldTable = TableQuery[AchievementEventDetailsFieldTable]
  private val achievementWebhookDetailsTable = TableQuery[AchievementWebhookDetailsTable]
  private val achievementWebhookDetailsFieldTable = TableQuery[AchievementWebhookDetailsFieldTable]

  override def getAggregationWindows(projectId: ProjectId, achievementRuleId: AchievementConfigurationRulePublicId)(
      implicit ec: ExecutionContext): Future[Seq[AggregationWindow]] =
    db.run {
      compiledAggregationWindowsQuery((projectId, achievementRuleId)).result.map(_.map {
        case (numberOfResults, windowRangeStart, windowRangeEnd) =>
          AggregationWindow(
            numberOfResults,
            windowRangeStart.map(OffsetDateTimeUtils.asUtc),
            windowRangeEnd.map(OffsetDateTimeUtils.asUtc))
      })
    }

  override def getAchievementEvents(baseParams: BaseFetchAchievementEventsParams, pageSize: Int, pageNumber: Int)(
      implicit ec: ExecutionContext): Future[Seq[AchievementEventEntityWithActionDetails]] =
    for {
      achievements <- getPlainAchievementEvents(baseParams, pageSize, pageNumber)
      eventFieldsMap <- getEventFieldsMap(achievements.flatMap(_.achievementEventDetails.map(_.id)))
      webhookFieldsMap <- getWebhookFieldsMap(achievements.flatMap(_.achievementWebhookDetails.map(_.id)))
    } yield achievements.map { achievement =>
      achievement
        .modify(_.achievementEventDetails.each.fields)
        .setTo(getEventFields(achievement.achievementEventDetails.map(_.id), eventFieldsMap))
        .modify(_.achievementWebhookDetails.each.fields)
        .setTo(getWebhookFields(achievement.achievementWebhookDetails.map(_.id), webhookFieldsMap))
    }

  override def countAchievementEvents(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId,
      groupByFieldValue: Option[String],
      windowRangeStart: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Int] =
    db.run {
      achievementEventsBaseQuery(projectId, achievementRuleId, groupByFieldValue, windowRangeStart).length.result
    }

  // for test purposes -- real ids will be assigned by DB
  override def createAchievementEvents(achievementEvents: Seq[AchievementEventEntityWithActionDetails])(implicit
      ec: ExecutionContext): Future[Unit] =
    achievementEvents.traverse(createAchievementEvent).map(_ => ())

  private def getPlainAchievementEvents(baseParams: BaseFetchAchievementEventsParams, pageSize: Int, pageNumber: Int)(
      implicit ec: ExecutionContext): Future[List[AchievementEventEntityWithActionDetails]] = {
    val offset = (pageNumber - 1) * pageSize
    db.run {
      val subqueryWithOrderBy = withOrderBy(
        achievementEventsBaseQuery(
          baseParams.projectId,
          baseParams.achievementRuleId,
          baseParams.groupByFieldValue,
          baseParams.windowRangeStart),
        baseParams.orderBy)
      val query = for {
        ((achievementEvent, eventDetails), webhookDetails) <-
          subqueryWithOrderBy
            .drop(offset)
            .take(pageSize)
            .joinLeft(achievementEventDetailsTable)
            .on(_.achievementEventDetailsId === _.id)
            .joinLeft(achievementWebhookDetailsTable)
            .on { case ((achievementEvent, _), webhookDetails) =>
              achievementEvent.achievementWebhookDetailsId === webhookDetails.id
            }
      } yield (achievementEvent, eventDetails, webhookDetails)
      query.result.map(_.map { case (achievementEvent, eventDetails, webhookDetails) =>
        fillEventAndWebhookWithoutFields(achievementEvent, eventDetails, webhookDetails)
      }.toList)
    }
  }

  private def fillEventAndWebhookWithoutFields(
      achievementEvent: AchievementEventEntity,
      eventDetails: Option[AchievementEventDetailsEntity],
      webhookDetails: Option[AchievementWebhookDetailsEntity]) = {
    achievementEvent.withDetails(
      eventDetails.map { ed =>
        AchievementEventDetailsEntityWithFields(
          id = ed.id,
          eventConfigurationId = ed.eventConfigurationId,
          fields = Nil,
          createdAt = ed.createdAt)
      },
      webhookDetails.map { wd =>
        AchievementWebhookDetailsEntityWithFields(
          id = wd.id,
          eventConfigurationId = wd.eventConfigurationId,
          requestType = wd.requestType,
          url = wd.url,
          fields = Nil,
          createdAt = wd.createdAt)
      })
  }

  private def achievementEventsBaseQuery(
      projectId: ProjectId,
      achievementRuleId: AchievementConfigurationRulePublicId,
      groupByFieldValue: Option[String],
      windowRangeStart: Option[OffsetDateTime]): Query[AchievementEventTable, AchievementEventEntity, Seq] =
    achievementEventTable
      .filter(_.projectId === projectId)
      .filter(_.achievementRuleId === achievementRuleId)
      .filterOpt(groupByFieldValue)((entity, groupByFieldValue) => entity.groupByFieldValue === groupByFieldValue)
      .filterIf(windowRangeStart.isEmpty)(_.windowRangeStart.isEmpty)
      .filterOpt(windowRangeStart)((entity, dateTime) => entity.windowRangeStart === dateTime)

  private def withOrderBy(query: Query[AchievementEventTable, AchievementEventEntity, Seq], orderBy: OrderByFilters) = {
    // note we need to revert order as Slick prepends values of sortBy
    val queryWithLastOrderBy = query.sortBy(_.id.asc)
    orderBy.filters.reverse.foldLeft(queryWithLastOrderBy) { case (currentQuery, ordering) =>
      currentQuery.sortBy(toDatabaseOrdering(ordering, _))
    }
  }

  private def toDatabaseOrdering(ordering: OrderByFilter, achievementEvent: AchievementEventTable) = {
    ordering match {
      case OrderByFilter(Asc, FieldValue)              => achievementEvent.groupByFieldValue.asc
      case OrderByFilter(Desc, OrderByType.FieldValue) => achievementEvent.groupByFieldValue.desc
      case OrderByFilter(OrderByDirection.Asc, OrderByType.AchievementDate) =>
        achievementEvent.achievementOriginDate.asc
      case OrderByFilter(OrderByDirection.Desc, OrderByType.AchievementDate) =>
        achievementEvent.achievementOriginDate.desc
    }
  }

  private def getEventFieldsMap(eventIds: List[AchievementEventDetailsId])(implicit
      ec: ExecutionContext): Future[Map[AchievementEventDetailsId, List[AchievementEventDetailsFieldEntity]]] =
    db.run {
      achievementEventDetailsFieldTable.filter(_.achievementEventDetailsId.inSet(eventIds)).result
    }.map(_.toList.groupBy(_.achievementEventDetailsId))

  private def getWebhookFieldsMap(webhookIds: List[AchievementWebhookDetailsId])(implicit
      ec: ExecutionContext): Future[Map[AchievementWebhookDetailsId, List[AchievementWebhookDetailsFieldEntity]]] =
    db.run {
      achievementWebhookDetailsFieldTable.filter(_.achievementWebhookDetailsId.inSet(webhookIds)).result
    }.map(_.toList.groupBy(_.achievementWebhookDetailsId))

  private def getEventFields(
      achievementEventConfigIdOpt: Option[AchievementEventDetailsId],
      eventFieldsMap: Map[AchievementEventDetailsId, List[AchievementEventDetailsFieldEntity]])
      : List[AchievementEventDetailsFieldEntity] =
    achievementEventConfigIdOpt.flatMap(id => eventFieldsMap.get(id)).getOrElse(Nil)

  private def getWebhookFields(
      achievementWebhookConfigIdOpt: Option[AchievementWebhookDetailsId],
      webhookFieldsMap: Map[AchievementWebhookDetailsId, List[AchievementWebhookDetailsFieldEntity]])
      : List[AchievementWebhookDetailsFieldEntity] =
    achievementWebhookConfigIdOpt.flatMap(id => webhookFieldsMap.get(id)).getOrElse(Nil)

  private def createAchievementEvent(achievementEvent: AchievementEventEntityWithActionDetails)(implicit
      ec: ExecutionContext): Future[Unit] =
    db.run {
      val eventDetails = achievementEvent.achievementEventDetails.toList
      val webhookDetails = achievementEvent.achievementWebhookDetails.toList
      (for {
        eventDetailsIds <- achievementEventDetailsTable.returning(
          achievementEventDetailsTable.map(_.id)) ++= eventDetails.map(_.toEventDetailsEntity)
        eventDetailsWithIds = eventDetails.zip(eventDetailsIds)
        eventDetailsFields = eventDetailsWithIds.flatMap { case (detailsEntity, id) =>
          detailsEntity.fields.map(_.copy(achievementEventDetailsId = id))
        }
        _ <- achievementEventDetailsFieldTable ++= eventDetailsFields
        webhookDetailsIds <- achievementWebhookDetailsTable.returning(
          achievementWebhookDetailsTable.map(_.id)) ++= webhookDetails.map(_.toWebhookDetailsEntity)
        webhookDetailsWithIds = webhookDetails.zip(webhookDetailsIds)
        webhookDetailsFields = webhookDetailsWithIds.flatMap { case (detailsEntity, id) =>
          detailsEntity.fields.map(_.copy(achievementWebhookDetailsId = id))
        }
        _ <- achievementWebhookDetailsFieldTable ++= webhookDetailsFields
        _ <- achievementEventTable.returning(
          achievementEventTable.map(_.id)) += achievementEvent.toAchievementEventEntity.copy(
          achievementEventDetailsId = eventDetailsIds.headOption,
          achievementWebhookDetailsId = webhookDetailsIds.headOption)
      } yield ()).transactionally
    }

  private def aggregationWindowsQuery(
      projectId: Rep[ProjectId],
      achievementRuleId: Rep[AchievementConfigurationRulePublicId]): Query[
    (Rep[Int], Rep[Option[OffsetDateTime]], Rep[Option[OffsetDateTime]]),
    (Int, Option[OffsetDateTime], Option[OffsetDateTime]),
    Seq] =
    achievementEventTable
      .filter(_.projectId === projectId)
      .filter(_.achievementRuleId === achievementRuleId)
      .groupBy(ar => (ar.windowRangeStart, ar.windowRangeEnd))
      .map { case ((windowRangeStart, windowRangeEnd), query) =>
        (query.length, windowRangeStart, windowRangeEnd)
      }
      .sortBy { case (_, windowRangeStart, _) => windowRangeStart }

  private val compiledAggregationWindowsQuery = Compiled(aggregationWindowsQuery _)
}

object SlickAchievementEventRepository {
  private type AchievementEventRow = (
      AchievementEventId,
      ProjectId,
      AchievementConfigurationRulePublicId,
      OffsetDateTime,
      String,
      ActionType,
      Option[OffsetDateTime],
      Option[OffsetDateTime],
      Option[AchievementEventDetailsId],
      Option[AchievementWebhookDetailsId],
      OffsetDateTime)
}
