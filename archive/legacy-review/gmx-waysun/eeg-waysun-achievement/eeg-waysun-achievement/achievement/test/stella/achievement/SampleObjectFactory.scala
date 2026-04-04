package stella.achievement

import scala.concurrent.Future

import akka.util.Timeout
import org.scalatest.matchers.should
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.http.Status.OK
import play.api.mvc.Result
import play.api.test.FakeHeaders
import play.api.test.Helpers.contentAsString
import play.api.test.Helpers.contentType
import play.api.test.Helpers.status
import spray.json.JsonReader
import spray.json.enrichString

import stella.common.core.OffsetDateTimeUtils.nowUtc
import stella.common.http.AggregationWindow
import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.achievement.models.AchievementActionDetails
import stella.achievement.models.AchievementEvent
import stella.achievement.models.AchievementEventActionDetails
import stella.achievement.models.AchievementWebhookActionDetails
import stella.achievement.models.ActionType
import stella.achievement.models.EventField
import stella.achievement.models.FieldValueType
import stella.achievement.models.Ids.AchievementConfigurationRulePublicId
import stella.achievement.models.Ids.EventConfigurationPublicId
import stella.achievement.models.RequestType.Delete
import stella.achievement.models.RequestType.Post
import stella.achievement.models.WebhookEventDetails

object SampleObjectFactory extends should.Matchers {
  val defaultHeaders: FakeHeaders = FakeHeaders(Seq(HeaderNames.HOST -> "localhost"))

  val testProjectId: ProjectId = ProjectId.random()

  val testAchievementRuleId: AchievementConfigurationRulePublicId = AchievementConfigurationRulePublicId.random()

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = UserId.random(),
      primaryProjectId = testProjectId,
      additionalProjectIds = Set.empty)

  val achievementEventWithEvent: AchievementEvent = {
    val now = nowUtc()
    val createdAt = now.minusDays(2).minusMinutes(5)
    AchievementEvent(
      achievementOriginDate = createdAt.minusMinutes(7),
      groupByFieldValue = "foo",
      windowRangeStart = Some(now),
      windowRangeEnd = Some(createdAt),
      action = AchievementActionDetails(
        actionType = ActionType.Event,
        details = AchievementEventActionDetails(
          eventId = EventConfigurationPublicId.random(),
          fields = List(
            EventField(fieldName = "foo_field1", valueType = FieldValueType.Boolean, value = "false"),
            EventField(fieldName = "foo_field2", valueType = FieldValueType.Integer, value = "-15")))),
      createdAt = createdAt)
  }

  val achievementEventWithWebhookWithEvent: AchievementEvent = {
    val now = nowUtc()
    val createdAt = now.minusDays(1).minusMinutes(10)
    AchievementEvent(
      achievementOriginDate = createdAt.minusMinutes(20),
      groupByFieldValue = "bar",
      windowRangeStart = Some(now),
      windowRangeEnd = Some(createdAt),
      action = AchievementActionDetails(
        actionType = ActionType.Webhook,
        details = AchievementWebhookActionDetails(
          requestType = Post,
          targetUrl = "http://test.webhook.com",
          eventConfig = Some(
            WebhookEventDetails(
              eventId = EventConfigurationPublicId.random(),
              fields = List(
                EventField(fieldName = "bar_field1", valueType = FieldValueType.String, value = "qwerty uiop"),
                EventField(fieldName = "bar_field2", valueType = FieldValueType.Float, value = "17.3")))))),
      createdAt = createdAt)
  }

  val achievementEventWithWebhookWithoutEvent: AchievementEvent =
    AchievementEvent(
      achievementOriginDate = nowUtc().minusMinutes(3),
      groupByFieldValue = "baz",
      windowRangeStart = None,
      windowRangeEnd = None,
      action = AchievementActionDetails(
        actionType = ActionType.Webhook,
        details = AchievementWebhookActionDetails(
          requestType = Delete,
          targetUrl = "https://test.webhook2.uk/delete",
          eventConfig = None)),
      createdAt = nowUtc())

  val achievementEventsPage: PaginatedResult[AchievementEvent] =
    PaginatedResult[AchievementEvent](
      pageNumber = 2,
      numberOfPages = Some(7),
      pageSize = 3,
      results =
        Seq(achievementEventWithEvent, achievementEventWithWebhookWithEvent, achievementEventWithWebhookWithoutEvent))

  def errorOutputResponse(errorCode: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode))

  def errorOutputResponse(errorCode: PresentationErrorCode, errorMessage: String): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode, errorMessage))

  def contentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T =
    reader.read(contentAsString(res).parseJson)

  def withOkStatusAndJsonContentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T = {
    status(res) shouldBe OK
    contentType(res) shouldBe Some(MimeTypes.JSON)
    contentAs(res)
  }

  val aggregationResultWindow: AggregationWindow =
    AggregationWindow(elements = 4, windowRangeStart = None, windowRangeEnd = None)

  val aggregationResultWindow2: AggregationWindow = AggregationWindow(
    elements = 1,
    windowRangeStart = Some(nowUtc().minusDays(1)),
    windowRangeEnd = Some(nowUtc().plusDays(6)))
}
