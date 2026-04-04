package stella.leaderboard.db

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future

import org.slf4j.Logger
import org.slf4j.LoggerFactory
import pl.iterators.kebs.tagged.slick.SlickSupport
import slick.basic.DatabaseConfig
import slick.jdbc.JdbcProfile

import stella.common.core.OffsetDateTimeUtils
import stella.common.models.Ids._

import stella.leaderboard.db.AggregationResultRepository.IdAndCreatedAtPair
import stella.leaderboard.db.ExtendedPostgresProfile.api._
import stella.leaderboard.models
import stella.leaderboard.models.Ids.AggregationResultId
import stella.leaderboard.models.Ids.AggregationRuleId
import stella.leaderboard.models._

class SlickAggregationResultRepository(dbConfig: DatabaseConfig[JdbcProfile])
    extends AggregationResultRepository
    with SlickSupport
    with PlainSqlImplicits {

  import SlickAggregationResultRepository._
  import dbConfig.db

  // --------------- database definitions ---------------

  private class AggregationResultTable(tag: Tag) extends Table[AggregationResultEntity](tag, "aggregation_results") {

    def id = column[AggregationResultId]("id", O.PrimaryKey, O.AutoInc)

    def projectId = column[ProjectId]("project_id")

    def aggregationRuleId = column[AggregationRuleId]("aggregation_rule_id")

    def groupByFieldValue = column[String]("group_by_field_value")

    def windowRangeStart = column[Option[OffsetDateTime]]("window_range_start")

    def windowRangeEnd = column[Option[OffsetDateTime]]("window_range_end")

    def min = column[Float]("min")

    def max = column[Float]("max")

    def count = column[Int]("count")

    def sum = column[Float]("sum")

    def custom = column[String]("custom")

    def createdAt = column[OffsetDateTime]("created_at")

    def updatedAt = column[OffsetDateTime]("updated_at")

    override def * =
      (
        id,
        projectId,
        aggregationRuleId,
        groupByFieldValue,
        windowRangeStart,
        windowRangeEnd,
        min,
        max,
        count,
        sum,
        custom,
        createdAt,
        updatedAt).<>(fromTableRow, AggregationResultEntity.unapply)
  }

  def fromTableRow(row: AggregationResultRow): AggregationResultEntity = row match {
    case (
          id,
          projectId,
          aggregationRuleId,
          groupByFieldValue,
          windowRangeStart,
          windowRangeEnd,
          min,
          max,
          count,
          sum,
          custom,
          createdAt,
          updatedAt) =>
      models.AggregationResultEntity(
        id = id,
        projectId = projectId,
        aggregationRuleId = aggregationRuleId,
        groupByFieldValue = groupByFieldValue,
        windowRangeStart = windowRangeStart.map(OffsetDateTimeUtils.asUtc),
        windowRangeEnd = windowRangeEnd.map(OffsetDateTimeUtils.asUtc),
        min = min,
        max = max,
        count = count,
        sum = sum,
        custom = custom,
        createdAt = OffsetDateTimeUtils.asUtc(createdAt),
        updatedAt = OffsetDateTimeUtils.asUtc(updatedAt))
  }

  // --------------- API ---------------
  def getAggregationWindows(projectId: ProjectId, aggregationRuleId: AggregationRuleId)(implicit
      ec: ExecutionContext): Future[Seq[AggregationWindow]] =
    db.run {
      compiledAggregationWindowsQuery((projectId, aggregationRuleId)).result.map(_.map {
        case (numberOfResults, windowRangeStart, windowRangeEnd) =>
          AggregationWindow(
            numberOfResults,
            windowRangeStart.map(OffsetDateTimeUtils.asUtc),
            windowRangeEnd.map(OffsetDateTimeUtils.asUtc))
      })
    }

  override def getAggregationResults(baseParams: BaseFetchAggregationResultsParams, pageSize: Int, pageNumber: Int)(
      implicit ec: ExecutionContext): Future[Seq[AggregationResult]] = {
    import baseParams._
    val positionOverOrderBy = computePositionOverOrderBy(orderBy.filters)
    val offset = (pageNumber - 1) * pageSize
    db.run {
      sql"""SELECT #${positionType.sqlFunctionName}() OVER (ORDER BY #$positionOverOrderBy) as pos,
           |  group_by_field_value, window_range_start, window_range_end, "min", "max", "count", "sum", custom,
           |  created_at, updated_at
           |FROM aggregation_results
           |WHERE project_id = $projectId AND aggregation_rule_id = $aggregationRuleId AND
           |  window_range_start #${windowRangeStart.map(dt => s"= '$dt'").getOrElse("IS null")}
           |ORDER BY pos ASC, id ASC
           |OFFSET $offset LIMIT $pageSize""".stripMargin.as[AggregationResult]
    }
  }

  override def countAggregationResults(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Int] =
    db.run {
      aggregationResultQuery
        .filter(_.projectId === projectId)
        .filter(_.aggregationRuleId === aggregationRuleId)
        .filterIf(windowRangeStart.isEmpty)(_.windowRangeStart.isEmpty)
        .filterOpt(windowRangeStart)((entity, dateTime) => entity.windowRangeStart === dateTime)
        .length
        .result
    }

  override def getAggregationResultNeighbors(
      baseParams: BaseFetchAggregationResultsParams,
      neighborsSize: Int,
      fieldValue: String)(implicit ec: ExecutionContext): Future[Seq[AggregationResult]] = {
    import baseParams._
    val positionOverOrderBy = computePositionOverOrderBy(orderBy.filters)
    db.run {
      sql"""WITH results_with_positions AS(
           |  SELECT
           |    #${positionType.sqlFunctionName}() OVER (ORDER BY #$positionOverOrderBy) as pos,
           |    id, group_by_field_value, window_range_start, window_range_end, "min", "max", "count", "sum", custom,
           |    created_at, updated_at
           |  FROM aggregation_results
           |  WHERE project_id = $projectId AND aggregation_rule_id = $aggregationRuleId AND
           |    window_range_start #${windowRangeStart.map(dt => s"= '$dt'").getOrElse("IS null")}
           |)
           |SELECT a.pos, a.group_by_field_value, a.window_range_start, a.window_range_end, a.min, a.max, a.count,
           |       a.sum, a.custom, a.created_at, a.updated_at
           |FROM results_with_positions a
           |JOIN results_with_positions b ON abs(a.pos - b.pos) <= $neighborsSize
           |WHERE b.group_by_field_value = $fieldValue
           |ORDER BY a.pos ASC, a.id ASC""".stripMargin.as[AggregationResult]
    }
  }

  def getAggregationResultsForValues(baseParams: BaseFetchAggregationResultsParams, fieldValues: Seq[String])(implicit
      ec: ExecutionContext): Future[Seq[AggregationResult]] = {
    import baseParams._
    val positionOverOrderBy = computePositionOverOrderBy(orderBy.filters)
    db.run {
      sql"""WITH results_with_positions AS(
           |  SELECT
           |    #${positionType.sqlFunctionName}() OVER (ORDER BY #$positionOverOrderBy) as pos,
           |    id, group_by_field_value, window_range_start, window_range_end, "min", "max", "count", "sum", custom,
           |    created_at, updated_at
           |  FROM aggregation_results
           |  WHERE project_id = $projectId AND aggregation_rule_id = $aggregationRuleId AND
           |    window_range_start #${windowRangeStart.map(dt => s"= '$dt'").getOrElse("IS null")}
           |)
           |SELECT pos, group_by_field_value, window_range_start, window_range_end, "min", "max", "count", "sum",
           |       custom, created_at, updated_at
           |FROM results_with_positions
           |WHERE group_by_field_value IN ($fieldValues#${",?" * (fieldValues.size - 1)})
           |ORDER BY pos ASC, id ASC""".stripMargin.as[AggregationResult]
    }
  }

  override def getAggregationResultEntities(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      windowRangeStart: Option[OffsetDateTime],
      windowRangeEnd: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Seq[AggregationResultEntity]] =
    db.run {
      aggregationResultQuery
        .filter(_.projectId === projectId)
        .filter(_.aggregationRuleId === aggregationRuleId)
        .filterIf(windowRangeStart.isEmpty)(_.windowRangeStart.isEmpty)
        .filterOpt(windowRangeStart)((entity, dateTime) => entity.windowRangeStart === dateTime)
        .filterIf(windowRangeEnd.isEmpty)(_.windowRangeEnd.isEmpty)
        .filterOpt(windowRangeEnd)((entity, dateTime) => entity.windowRangeEnd === dateTime)
        .sortBy(_.id)
        .result
    }

  override def getAggregationResultInfo(
      projectId: ProjectId,
      aggregationRuleId: AggregationRuleId,
      groupByFieldValue: String,
      windowRangeStart: Option[OffsetDateTime],
      windowRangeEnd: Option[OffsetDateTime])(implicit ec: ExecutionContext): Future[Option[IdAndCreatedAtPair]] =
    db.run {
      aggregationResultQuery
        .filter(_.projectId === projectId)
        .filter(_.aggregationRuleId === aggregationRuleId)
        .filter(_.groupByFieldValue === groupByFieldValue)
        .filterIf(windowRangeStart.isEmpty)(_.windowRangeStart.isEmpty)
        .filterOpt(windowRangeStart)((entity, dataTime) => entity.windowRangeStart === dataTime)
        .filterIf(windowRangeEnd.isEmpty)(_.windowRangeEnd.isEmpty)
        .filterOpt(windowRangeEnd)((entity, dateTime) => entity.windowRangeEnd === dateTime)
        .map(aggregationResult => (aggregationResult.id, aggregationResult.createdAt))
        .result
        .headOption
    }

  override def createAggregationResults(
      newAggregationResults: Seq[AggregationResultFromEvent],
      aggregationResultsToUpdate: Seq[AggregationResultEntity])(implicit ec: ExecutionContext): Future[Unit] =
    db.run {
      (for {
        createResult <- aggregationResultQuery ++= newAggregationResults.map(
          _.toAggregationResultEntity(AggregationResultId(0)))
        updateResult <- aggregationResultQuery.insertOrUpdateAll(aggregationResultsToUpdate)
      } yield {
        log.trace(s"Stored new aggregation results: $createResult, updated aggregation results: $updateResult")
        ()
      }).transactionally
    }

  // --------------- queries ---------------
  private val aggregationResultQuery = TableQuery[AggregationResultTable]

  private def aggregationWindowsQuery(projectId: Rep[ProjectId], aggregationRuleId: Rep[AggregationRuleId]): Query[
    (Rep[Int], Rep[Option[OffsetDateTime]], Rep[Option[OffsetDateTime]]),
    (Int, Option[OffsetDateTime], Option[OffsetDateTime]),
    Seq] =
    aggregationResultQuery
      .filter(_.projectId === projectId)
      .filter(_.aggregationRuleId === aggregationRuleId)
      .groupBy(ar => (ar.windowRangeStart, ar.windowRangeEnd))
      .map { case ((windowRangeStart, windowRangeEnd), query) =>
        (query.length, windowRangeStart, windowRangeEnd)
      }
      .sortBy { case (_, windowRangeStart, _) => windowRangeStart }

  private val compiledAggregationWindowsQuery = Compiled(aggregationWindowsQuery _)

  private def computePositionOverOrderBy(orderBy: Seq[OrderByFilter]): String =
    orderBy.map(DbSpecificOrderBy.apply).map(v => s""""${v.field}" ${v.direction}""").mkString(",")
}

object SlickAggregationResultRepository {
  private type AggregationResultRow = (
      AggregationResultId,
      ProjectId,
      AggregationRuleId,
      String,
      Option[OffsetDateTime],
      Option[OffsetDateTime],
      Float,
      Float,
      Int,
      Float,
      String,
      OffsetDateTime,
      OffsetDateTime)

  final case class DbSpecificOrderBy private (field: String, direction: String)

  object DbSpecificOrderBy {
    def apply(orderBy: OrderByFilter): DbSpecificOrderBy = {
      val field = orderBy.orderByType match {
        case OrderByType.Max        => "max"
        case OrderByType.Min        => "min"
        case OrderByType.Count      => "count"
        case OrderByType.Sum        => "sum"
        case OrderByType.FieldValue => "group_by_field_value"
      }
      DbSpecificOrderBy(field, orderBy.direction.entryName)
    }
  }

  private val log: Logger = LoggerFactory.getLogger(getClass)
}
