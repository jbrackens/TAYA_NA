package stella.achievement

import java.time.OffsetDateTime
import java.util.UUID

import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.OrderByFilters

object TestConstants {
  object Endpoint {
    val achievementBasePath = "/achievements"

    def achievementEventsEndpointPath(achievementRuleId: UUID) = s"$achievementBasePath/$achievementRuleId"

    def aggregationWindowsEndpointPath(achievementRuleId: UUID) = s"$achievementBasePath/$achievementRuleId/windows"

    def achievementEventsQueryString(
        baseParams: BaseFetchAchievementEventsParams,
        pageSize: Int,
        pageNumber: Int,
        countPages: Option[Boolean]): String = achievementEventsQueryString(
      baseParams.windowRangeStart,
      baseParams.orderBy,
      pageSize,
      pageNumber,
      countPages,
      baseParams.groupByFieldValue)

    def achievementEventsQueryString(
        windowRangeStart: Option[OffsetDateTime],
        orderBy: OrderByFilters,
        pageSize: Int,
        pageNumber: Int,
        countPages: Option[Boolean] = None,
        groupByFieldValue: Option[String] = None): String = {
      val fieldValueParam =
        groupByFieldValue.map(value => s"${QueryParam.fieldValue}=$value&").getOrElse("")
      val windowRangeStartParam =
        windowRangeStart.map(dateTime => s"${QueryParam.windowRangeStart}=$dateTime&").getOrElse("")
      val countPagesParam = countPages.map(value => s"${QueryParam.countPages}=$value&").getOrElse("")
      val pageSizeParam = s"${QueryParam.pageSize}=$pageSize"
      val pageParam = s"${QueryParam.pageNumber}=$pageNumber"
      val orderByParam = s"${QueryParam.orderBy}=${orderBy.toQueryParam}"
      s"?$fieldValueParam$windowRangeStartParam$countPagesParam$pageSizeParam&$pageParam&$orderByParam"
    }
  }

  object QueryParam {
    val countPages = "count_pages"
    val fieldValue = "field_value"
    val orderBy = "order_by"
    val pageNumber = "page"
    val pageSize = "page_size"
    val windowRangeStart = "window_range_start"
  }

  val defaultCountPages = false
  val defaultPageNumber = 1
  val defaultPageSize = 20
  val maxPageSize = 1000
  val minPageNumber = 1
  val minPageSize = 1

  val okStatus = "ok"
}
