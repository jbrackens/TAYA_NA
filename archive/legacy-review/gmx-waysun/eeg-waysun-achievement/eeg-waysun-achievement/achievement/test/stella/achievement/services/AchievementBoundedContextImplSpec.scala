package stella.achievement.services

import java.time.OffsetDateTime

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.util.Random

import org.scalamock.scalatest.AsyncMockFactory
import org.scalatest.OptionValues
import org.scalatest.flatspec.AsyncFlatSpec
import org.scalatest.matchers.should
import org.scalatestplus.scalacheck.ScalaCheckDrivenPropertyChecks

import stella.common.core.OffsetDateTimeUtils
import stella.common.http.PaginatedResult
import stella.common.models.Ids._

import stella.achievement.SampleObjectFactory._
import stella.achievement.db.AchievementEventRepository
import stella.achievement.models.AchievementEvent
import stella.achievement.models.AchievementEventActionDetails
import stella.achievement.models.AchievementEventDetailsEntityWithFields
import stella.achievement.models.AchievementEventDetailsFieldEntity
import stella.achievement.models.AchievementEventEntityWithActionDetails
import stella.achievement.models.AchievementWebhookActionDetails
import stella.achievement.models.AchievementWebhookDetailsEntityWithFields
import stella.achievement.models.AchievementWebhookDetailsFieldEntity
import stella.achievement.models.BaseFetchAchievementEventsParams
import stella.achievement.models.Ids._
import stella.achievement.routes.gen.Generators._

// Note in these tests we use .sample on generators because AsyncFlatSpec doesn't integrate well with property based tests
class AchievementBoundedContextImplSpec
    extends AsyncFlatSpec
    with should.Matchers
    with ScalaCheckDrivenPropertyChecks
    with AsyncMockFactory
    with OptionValues {

  private val baseParams = baseFetchAchievementEventsParamsGen(testProjectId, testAchievementRuleId).sample.value
  private val pageSize = pageSizeGen.sample.value
  private val pageNumber = pageNumberGen.sample.value

  private val achievementEvents =
    Seq(achievementEventWithEvent, achievementEventWithWebhookWithEvent, achievementEventWithWebhookWithoutEvent)
  private val internalAchievementEvents = achievementEvents.map(toTestInternalAchievementEvent)

  "getAggregationWindows" should "properly call repository" in {
    val repository = mock[AchievementEventRepository]
    val boundedContext = new AchievementBoundedContextImpl(repository)
    val aggregationWindows = Seq(aggregationResultWindow, aggregationResultWindow2)
    (repository
      .getAggregationWindows(_: ProjectId, _: AchievementConfigurationRulePublicId)(_: ExecutionContext))
      .expects(testProjectId, testAchievementRuleId, *)
      .returning(Future.successful(aggregationWindows))
      .once()
    for {
      windows <- boundedContext.getAggregationWindows(testProjectId, testAchievementRuleId)
    } yield {
      windows shouldBe aggregationWindows
    }
  }

  "getAchievementEventsPage" should "properly call repository" in {
    val repository = mock[AchievementEventRepository]
    val boundedContext = new AchievementBoundedContextImpl(repository)
    val countPages = false
    (repository
      .countAchievementEvents(
        _: ProjectId,
        _: AchievementConfigurationRulePublicId,
        _: Option[String],
        _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(*, *, *, *, *)
      .never()
    (repository
      .getAchievementEvents(_: BaseFetchAchievementEventsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(baseParams, pageSize, pageNumber, *)
      .returning(Future.successful(internalAchievementEvents))
      .once()
    for {
      page <- boundedContext.getAchievementEventsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      val numberOfPages = None
      page shouldBe PaginatedResult[AchievementEvent](pageNumber, numberOfPages, pageSize, achievementEvents)
    }
  }

  it should "properly call repository when expecting also number of pages" in {
    val repository = mock[AchievementEventRepository]
    val boundedContext = new AchievementBoundedContextImpl(repository)
    val countPages = true
    // a current page is expected to be not higher than a number of pages
    val numberOfPages = Integer.max(pageNumberGen.sample.value, pageNumber)
    val numberOfResults = (numberOfPages - 1) * pageSize + Random.nextInt(pageSize) + 1
    (repository
      .countAchievementEvents(
        _: ProjectId,
        _: AchievementConfigurationRulePublicId,
        _: Option[String],
        _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(testProjectId, testAchievementRuleId, baseParams.groupByFieldValue, baseParams.windowRangeStart, *)
      .returning(Future.successful(numberOfResults))
      .once()
    (repository
      .getAchievementEvents(_: BaseFetchAchievementEventsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(baseParams, pageSize, pageNumber, *)
      .returning(Future.successful(internalAchievementEvents))
      .once()
    for {
      page <- boundedContext.getAchievementEventsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      page shouldBe PaginatedResult[AchievementEvent](pageNumber, Some(numberOfPages), pageSize, achievementEvents)
    }
  }

  it should "properly call repository when expecting also number of pages and page number is higher than number of pages" in {
    val repository = mock[AchievementEventRepository]
    val boundedContext = new AchievementBoundedContextImpl(repository)
    val countPages = true
    val numberOfPages = pageNumber - 1
    (repository
      .countAchievementEvents(
        _: ProjectId,
        _: AchievementConfigurationRulePublicId,
        _: Option[String],
        _: Option[OffsetDateTime])(_: ExecutionContext))
      .expects(testProjectId, testAchievementRuleId, baseParams.groupByFieldValue, baseParams.windowRangeStart, *)
      .returning(Future.successful(numberOfPages * pageSize))
      .once()
    // when we know the page doesn't exist, we don't look for the results as there's no point to do so
    (repository
      .getAchievementEvents(_: BaseFetchAchievementEventsParams, _: Int, _: Int)(_: ExecutionContext))
      .expects(*, *, *, *)
      .never()
    for {
      page <- boundedContext.getAchievementEventsPage(baseParams, pageSize, pageNumber, countPages)
    } yield {
      page shouldBe PaginatedResult[AchievementEvent](pageNumber, Some(numberOfPages), pageSize, Nil)
    }
  }

  private def toTestInternalAchievementEvent(event: AchievementEvent): AchievementEventEntityWithActionDetails = {
    val date = OffsetDateTimeUtils.asUtc(event.createdAt)
    val (achievementEventDetails, achievementWebhookDetails) = event.action.details match {
      case action: AchievementEventActionDetails =>
        (
          Some(
            AchievementEventDetailsEntityWithFields(
              id = AchievementEventDetailsId(0),
              eventConfigurationId = action.eventId,
              fields = action.fields.map(field =>
                AchievementEventDetailsFieldEntity(
                  id = AchievementEventDetailsFieldId(0),
                  achievementEventDetailsId = AchievementEventDetailsId(0),
                  fieldName = field.fieldName,
                  valueType = field.valueType,
                  value = field.value,
                  createAt = date)),
              createdAt = date)),
          None)
      case action: AchievementWebhookActionDetails =>
        (
          None,
          Some(
            AchievementWebhookDetailsEntityWithFields(
              id = AchievementWebhookDetailsId(0),
              eventConfigurationId = action.eventConfig.map(_.eventId),
              requestType = action.requestType,
              url = action.targetUrl,
              fields = action.eventConfig.toList.flatMap(_.fields.map(field =>
                AchievementWebhookDetailsFieldEntity(
                  id = AchievementWebhookDetailsFieldId(0),
                  achievementWebhookDetailsId = AchievementWebhookDetailsId(0),
                  fieldName = field.fieldName,
                  valueType = field.valueType,
                  value = field.value,
                  createAt = date))),
              createdAt = date)))
    }
    AchievementEventEntityWithActionDetails(
      id = AchievementEventId(0),
      projectId = testProjectId,
      achievementRuleId = testAchievementRuleId,
      achievementOriginDate = event.achievementOriginDate,
      groupByFieldValue = event.groupByFieldValue,
      actionType = event.action.actionType,
      windowRangeStart = event.windowRangeStart,
      windowRangeEnd = event.windowRangeEnd,
      achievementEventDetails = achievementEventDetails,
      achievementWebhookDetails = achievementWebhookDetails,
      createdAt = event.createdAt)
  }
}
