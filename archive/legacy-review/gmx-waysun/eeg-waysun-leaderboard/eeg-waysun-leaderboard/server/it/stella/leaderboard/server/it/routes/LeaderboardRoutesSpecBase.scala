package stella.leaderboard.server.it.routes

import scala.concurrent.ExecutionContext

import play.api.http.Writeable
import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.PaginatedResult

import stella.leaderboard.it.utils.TestAuthContext
import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationWindow
import stella.leaderboard.models.OrderByDirection
import stella.leaderboard.models.OrderByFilter
import stella.leaderboard.models.OrderByFilters
import stella.leaderboard.models.OrderByType
import stella.leaderboard.models._
import stella.leaderboard.server.routes.ResponseFormats._

trait LeaderboardRoutesSpecBase extends RoutesSpecBase {
  // scalastyle:off
  protected implicit def ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
  // scalastyle:on

  protected var testData: TestData = _

  override def afterStart(): Unit = {
    super.afterStart()
    testData = new TestData()
    testData.populateDatabaseWithDefaultData(leaderboardModule.aggregationResultRepository, awaitTimeout)
  }

  protected val testOrderBy: OrderByFilters = OrderByFilters(Seq(OrderByFilter(OrderByDirection.Asc, OrderByType.Min)))

  protected def sendRequestAndReturnAggregationWindows(
      path: String,
      authContext: TestAuthContext): Seq[AggregationWindow] = {
    val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnAggregationWindows(request, authContext)
  }

  protected def sendRequestAndReturnAggregationWindows[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext): Seq[AggregationWindow] =
    sendRequestAndReturnDetails[ContentType, Seq[AggregationWindow]](request, authContext, OK)

  protected def sendRequestAndReturnPage(
      path: String,
      authContext: TestAuthContext): PaginatedResult[AggregationResult] = {
    val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnPage(request, authContext)
  }

  protected def sendRequestAndReturnPage[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext): PaginatedResult[AggregationResult] =
    sendRequestAndReturnDetails[ContentType, PaginatedResult[AggregationResult]](request, authContext, OK)

  protected def sendRequestAndReturnNeighbors(path: String, authContext: TestAuthContext): Seq[AggregationResult] = {
    val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AggregationResult]](request, authContext, OK)
  }

  protected def sendRequestToCompareValues(path: String, authContext: TestAuthContext): Seq[AggregationResult] = {
    val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnDetails[AnyContentAsEmpty.type, Seq[AggregationResult]](request, authContext, OK)
  }
}
