package stella.leaderboard.server.routes

import java.time.OffsetDateTime
import java.util.UUID

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

import stella.common.http.PaginatedResult
import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId

import stella.leaderboard.models.AggregationResult
import stella.leaderboard.models.AggregationResultEntity
import stella.leaderboard.models.Ids.AggregationResultId
import stella.leaderboard.models.Ids.AggregationRuleId

object SampleObjectFactory extends should.Matchers {
  val defaultHeaders: FakeHeaders = FakeHeaders(Seq(HeaderNames.HOST -> "localhost"))

  val testProjectId: ProjectId = ProjectId.random()

  val testAggregationRuleId: AggregationRuleId = AggregationRuleId.random()

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = UUID.randomUUID(),
      primaryProjectId = testProjectId,
      additionalProjectIds = Set.empty)

  val aggregationResultEntity: AggregationResultEntity = AggregationResultEntity(
    id = AggregationResultId(0),
    projectId = ProjectId.random(),
    aggregationRuleId = testAggregationRuleId,
    groupByFieldValue = "foo_value",
    windowRangeStart = None,
    windowRangeEnd = None,
    min = 1.1f,
    max = 2.2f,
    count = 3,
    sum = 4.4f,
    custom = "foo_custom_value",
    createdAt = OffsetDateTime.now().minusMinutes(3),
    updatedAt = OffsetDateTime.now().minusMinutes(2))

  val aggregationResultEntity2: AggregationResultEntity = AggregationResultEntity(
    id = AggregationResultId(1),
    projectId = ProjectId.random(),
    aggregationRuleId = AggregationRuleId.random(),
    groupByFieldValue = "bar_value",
    windowRangeStart = Some(OffsetDateTime.now().minusDays(10)),
    windowRangeEnd = Some(OffsetDateTime.now().minusDays(3)),
    min = 11.1f,
    max = 12.2f,
    count = 13,
    sum = 14.4f,
    custom = "bar_custom_value",
    createdAt = OffsetDateTime.now().minusMinutes(1),
    updatedAt = OffsetDateTime.now())

  val aggregationResult: AggregationResult = aggregationResultEntity.toAggregationResult(position = 7)

  val aggregationResult2: AggregationResult = aggregationResultEntity2.toAggregationResult(position = 8)

  val aggregationResultsPage: PaginatedResult[AggregationResult] =
    PaginatedResult[AggregationResult](
      pageNumber = 3,
      numberOfPages = Some(7),
      pageSize = 2,
      results = Seq(aggregationResult, aggregationResult2))

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
}
