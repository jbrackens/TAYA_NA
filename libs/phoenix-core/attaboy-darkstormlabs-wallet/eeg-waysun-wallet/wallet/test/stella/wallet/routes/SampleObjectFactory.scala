package stella.wallet.routes

import scala.concurrent.Future

import akka.util.Timeout
import org.scalatest.OptionValues
import org.scalatest.matchers.should
import play.api.http.HeaderNames
import play.api.http.MimeTypes
import play.api.libs.json.JsObject
import play.api.libs.json.JsString
import play.api.mvc.Result
import play.api.test.FakeHeaders
import play.api.test.Helpers.contentAsString
import play.api.test.Helpers.contentType
import play.api.test.Helpers.status
import spray.json.JsonReader
import spray.json.enrichString

import stella.common.http.Response
import stella.common.http.error.ErrorOutput
import stella.common.http.error.PresentationErrorCode
import stella.common.http.jwt.FullyPermissivePermissions
import stella.common.http.jwt.StellaAuthContext
import stella.common.models.Ids.ProjectId
import stella.common.models.Ids.UserId

import stella.wallet.models.Ids.CurrencyId
import stella.wallet.models.currency._
import stella.wallet.models.wallet.FundsTransferType
import stella.wallet.models.wallet.PositiveBigDecimal
import stella.wallet.models.wallet.TransferFundsRequest

object SampleObjectFactory extends should.Matchers with OptionValues {

  val defaultHeaders: FakeHeaders = FakeHeaders(Seq(HeaderNames.HOST -> "localhost"))
  val okStatus = "ok"

  val testProjectId: ProjectId = ProjectId.random()
  val testAdditionalProjectId1: ProjectId = ProjectId.random()
  val testAdditionalProjectId2: ProjectId = ProjectId.random()
  val testUserId: UserId = UserId.random()
  val testSenderUserId: UserId = UserId.random()
  val testCurrencyId: CurrencyId = CurrencyId.random()

  val testAuthContext: StellaAuthContext =
    StellaAuthContext(
      FullyPermissivePermissions,
      userId = testSenderUserId,
      primaryProjectId = testProjectId,
      additionalProjectIds = Set(testAdditionalProjectId1, testAdditionalProjectId2))

  val testAllAllowedProjectIds: Set[ProjectId] =
    (testAuthContext.additionalProjectIds + testAuthContext.primaryProjectId).map(ProjectId.apply)

  val createCurrencyWithAssociatedProjectsRequest: CreateCurrencyWithAssociatedProjectsRequest =
    CreateCurrencyWithAssociatedProjectsRequest(
      name = "testCurrency2",
      verboseName = "Test Currency 2",
      symbol = "TC2",
      associatedProjects = List(testProjectId, testAdditionalProjectId1))

  val createCurrencyWithAssociatedProjectsRequestJson: JsObject =
    CreateCurrencyWithAssociatedProjectsRequest.createCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
      createCurrencyWithAssociatedProjectsRequest)

  val updateCurrencyWithAssociatedProjectsRequest: UpdateCurrencyWithAssociatedProjectsRequest =
    UpdateCurrencyWithAssociatedProjectsRequest(
      name = "testCurrency4",
      verboseName = "Test Currency 4",
      symbol = "TC4",
      associatedProjects = List(ProjectId.random(), ProjectId.random()))

  val updateCurrencyWithAssociatedProjectsRequestJson: JsObject =
    UpdateCurrencyWithAssociatedProjectsRequest.updateCurrencyWithAssociatedProjectsRequestPlayFormat.writes(
      updateCurrencyWithAssociatedProjectsRequest)

  val transferFundsRequest: TransferFundsRequest = TransferFundsRequest(
    transferType = FundsTransferType.TopUpFunds,
    externalTransactionId = "tst-tx-1",
    title = "Test transaction 1",
    currencyId = testCurrencyId,
    amount = PositiveBigDecimal(64.2))

  val transferFundsRequestJson: JsObject =
    TransferFundsRequest.transferFundsRequestPlayFormat.writes(transferFundsRequest)

  def jsonWithChangedStringField(json: JsObject, fieldName: String, value: String): JsObject =
    json.copy(json.value.concat(List(fieldName -> JsString(value))))

  def errorOutputResponse(errorCode: PresentationErrorCode): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode))

  def errorOutputResponse(errorCode: PresentationErrorCode, errorMessage: String): Response[ErrorOutput] =
    Response.asFailure(ErrorOutput.one(errorCode, errorMessage))

  def contentAs[T](res: Future[Result])(implicit reader: JsonReader[T], timeout: Timeout): T =
    reader.read(contentAsString(res).parseJson)

  def withStatusCodeAndJsonContentAs[T: JsonReader](res: Future[Result], statusCode: Int)(implicit
      timeout: Timeout): T = {
    status(res) shouldBe statusCode
    contentType(res) shouldBe Some(MimeTypes.JSON)
    contentAs(res)
  }
}
