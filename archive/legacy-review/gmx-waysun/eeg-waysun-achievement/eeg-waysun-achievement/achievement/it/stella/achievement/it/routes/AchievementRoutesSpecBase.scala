package stella.achievement.it.routes

import scala.concurrent.ExecutionContext

import play.api.http.Writeable
import play.api.mvc.AnyContentAsEmpty
import play.api.test.FakeRequest
import play.api.test.Helpers._

import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult

import stella.achievement.it.utils.TestAuthContext
import stella.achievement.models.AchievementEvent
import stella.achievement.routes.ResponseFormats._

trait AchievementRoutesSpecBase extends RoutesSpecBase {
  // scalastyle:off
  protected implicit def ec: ExecutionContext = scala.concurrent.ExecutionContext.Implicits.global
  // scalastyle:on

  protected var testData: TestData = _

  override def afterStart(): Unit = {
    super.afterStart()
    testData = new TestData()
    testData.populateDatabaseWithDefaultData(achievementModule.achievementEventRepository, awaitTimeout)
  }

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
      authContext: TestAuthContext): PaginatedResult[AchievementEvent] = {
    val request = FakeRequest(GET, path, headersWithJwt, AnyContentAsEmpty)
    sendRequestAndReturnPage(request, authContext)
  }

  protected def sendRequestAndReturnPage[ContentType: Writeable](
      request: FakeRequest[ContentType],
      authContext: TestAuthContext): PaginatedResult[AchievementEvent] =
    sendRequestAndReturnDetails[ContentType, PaginatedResult[AchievementEvent]](request, authContext, OK)
}
