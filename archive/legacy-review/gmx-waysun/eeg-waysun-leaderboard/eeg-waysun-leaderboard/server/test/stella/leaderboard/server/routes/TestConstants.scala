package stella.leaderboard.server.routes

import java.time.OffsetDateTime
import java.util.UUID

import stella.leaderboard.models.BaseFetchAggregationResultsParams
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.PositionType

object TestConstants {
  object Endpoint {
    val leaderboardBasePath = "/leaderboard/aggregations"

    def aggregationResultsEndpointPath(aggregationRuleId: UUID) = s"$leaderboardBasePath/$aggregationRuleId"

    def aggregationWindowsEndpointPath(aggregationRuleId: UUID) = s"$leaderboardBasePath/$aggregationRuleId/windows"

    def aggregationResultNeighborsEndpointPath(aggregationRuleId: UUID): String =
      s"$leaderboardBasePath/$aggregationRuleId/neighbors"

    def compareAggregationResultsEndpointPath(aggregationRuleId: UUID): String =
      s"$leaderboardBasePath/$aggregationRuleId/compare"

    def aggregationResultsQueryString(
        baseParams: BaseFetchAggregationResultsParams,
        pageSize: Int,
        pageNumber: Int,
        countPages: Option[Boolean]): String = aggregationResultsQueryString(
      baseParams.windowRangeStart,
      baseParams.orderBy,
      baseParams.positionType,
      pageSize,
      pageNumber,
      countPages)

    def aggregationResultsQueryString(
        windowRangeStart: Option[OffsetDateTime],
        orderBy: OrderByFilters,
        positionType: PositionType,
        pageSize: Int,
        pageNumber: Int,
        countPages: Option[Boolean] = None): String = {
      val windowRangeStartParam =
        windowRangeStart.map(dateTime => s"${QueryParam.windowRangeStart}=$dateTime&").getOrElse("")
      val countPagesParam = countPages.map(value => s"${QueryParam.countPages}=$value&").getOrElse("")
      val pageSizeParam = s"${QueryParam.pageSize}=$pageSize"
      val pageParam = s"${QueryParam.pageNumber}=$pageNumber"
      val orderByParam = s"${QueryParam.orderBy}=${orderBy.toQueryParam}"
      val positionTypeParam = s"${QueryParam.positionType}=${positionType.entryName}"
      s"?$windowRangeStartParam$countPagesParam$pageSizeParam&$pageParam&$orderByParam&$positionTypeParam"
    }

    def aggregationResultNeighborsQueryString(
        baseParams: BaseFetchAggregationResultsParams,
        neighborsSize: Int,
        fieldValue: String): String = aggregationResultNeighborsQueryString(
      baseParams.windowRangeStart,
      baseParams.orderBy,
      baseParams.positionType,
      neighborsSize,
      fieldValue)

    def aggregationResultNeighborsQueryString(
        windowRangeStart: Option[OffsetDateTime],
        orderBy: OrderByFilters,
        positionType: PositionType,
        neighborsSize: Int,
        fieldValue: String): String = {
      val windowRangeStartStr =
        windowRangeStart.map(dateTime => s"${QueryParam.windowRangeStart}=$dateTime&").getOrElse("")
      val orderByParam = s"${QueryParam.orderBy}=${orderBy.toQueryParam}"
      val neighborsSizeParam = s"${QueryParam.neighborsSize}=$neighborsSize"
      val fieldValueParam = s"${QueryParam.fieldValue}=$fieldValue"
      val positionTypeParam = s"${QueryParam.positionType}=${positionType.entryName}"
      s"?$windowRangeStartStr$orderByParam&$neighborsSizeParam&$fieldValueParam&$positionTypeParam"
    }

    def compareAggregationResultsQueryString(
        baseParams: BaseFetchAggregationResultsParams,
        fieldValues: Seq[String]): String = compareAggregationResultsQueryString(
      baseParams.windowRangeStart,
      baseParams.orderBy,
      baseParams.positionType,
      fieldValues)

    def compareAggregationResultsQueryString(
        windowRangeStart: Option[OffsetDateTime],
        orderBy: OrderByFilters,
        positionType: PositionType,
        fieldValues: Seq[String]): String = {
      val windowRangeStartStr =
        windowRangeStart.map(dateTime => s"${QueryParam.windowRangeStart}=$dateTime&").getOrElse("")
      val orderByParam = s"${QueryParam.orderBy}=${orderBy.toQueryParam}"
      val fieldValuesParam = s"${QueryParam.fieldValues}=${fieldValues.mkString(s"&${QueryParam.fieldValues}=")}"
      val positionTypeParam = s"${QueryParam.positionType}=${positionType.entryName}"
      s"?$windowRangeStartStr$orderByParam&$fieldValuesParam&$positionTypeParam"
    }
  }

  object QueryParam {
    val countPages = "count_pages"
    val fieldValue = "field_value"
    val fieldValues = "field_values"
    val orderBy = "order_by"
    val pageNumber = "page"
    val pageSize = "page_size"
    val positionType = "position_type"
    val neighborsSize = "size"
    val windowRangeStart = "window_range_start"
  }

  val defaultCountPages = false
  val defaultNeighborsSize = 3
  val defaultPageNumber = 1
  val defaultPageSize = 20
  val maxNeighborsSize = 500
  val maxPageSize = 1000
  val minNeighborsSize = 1
  val minPageNumber = 1
  val minPageSize = 1
  val defaultPositionType: PositionType = PositionType.DenseRank

  val okStatus = "ok"
}
