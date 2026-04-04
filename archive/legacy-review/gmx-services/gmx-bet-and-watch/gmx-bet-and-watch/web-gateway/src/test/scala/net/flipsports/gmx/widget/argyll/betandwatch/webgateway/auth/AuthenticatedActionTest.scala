package net.flipsports.gmx.widget.argyll.betandwatch.webgateway.auth

import net.flipsports.gmx.widget.argyll.betandwatch.common.auth.{IAuthenticationService, InvalidTokenException, UserDetails}
import org.junit.runner.RunWith
import org.mockito.BDDMockito.given
import org.mockito.MockitoSugar
import org.mockito.stubbing.Answer
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import play.api.mvc._
import play.api.test.FakeRequest
import play.api.test.Helpers._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

@RunWith(classOf[JUnitRunner])
class AuthenticatedActionTest extends FunSuite with MockitoSugar {

  private val bodyParserMock = mock[BodyParser[AnyContent]]

  private val authenticationServiceMock = mock[IAuthenticationService]

  private val objectUnderTest = new AuthenticatedAction(bodyParserMock, authenticationServiceMock)

  test("'invokeBlock()' should return 401 when missing header") {
    // given
    val givenRequest = FakeRequest()
    val fakeBlockCaptor = new FakeBlock

    // when
    val eventualResult = objectUnderTest.invokeBlock(givenRequest, fakeBlockCaptor)

    // then
    contentAsJson(eventualResult)

    fakeBlockCaptor.argCaptured.user.isLeft should be(true)
    fakeBlockCaptor.argCaptured.user.left.toOption.get should be ("Missing 'Authorization' header or invalid 'Bearer'")
  }

  test("'invokeBlock()' should return 401 when wrong bearer header") {
    // given
    val givenRequest = FakeRequest()
      .withHeaders(("Authorization", "Bear"))
    val fakeBlockCaptor = new FakeBlock

    // when
    val eventualResult = objectUnderTest.invokeBlock(givenRequest, fakeBlockCaptor)

    // then
    contentAsJson(eventualResult)

    fakeBlockCaptor.argCaptured.user.isLeft should be(true)
    fakeBlockCaptor.argCaptured.user.left.toOption.get should be ("Missing 'Authorization' header or invalid 'Bearer'")
  }

  test("'invokeBlock()' should return 401 when AuthenticationService fails") {
    // given
    val givenRequest = FakeRequest()
      .withHeaders(("Authorization", "Bearer 123"))
    given(authenticationServiceMock.getUserInfo("123")).willAnswer(futureException)
    val fakeBlockCaptor = new FakeBlock

    // when
    val eventualResult = objectUnderTest.invokeBlock(givenRequest, fakeBlockCaptor)

    // then
    contentAsJson(eventualResult)

    fakeBlockCaptor.argCaptured.user.isLeft should be(true)
    fakeBlockCaptor.argCaptured.user.left.toOption.get should be ("Missing 'Authorization' header or invalid 'Bearer'")
  }

  test("'invokeBlock()' should return 200 when AuthenticationService returns user") {
    // given
    val givenRequest = FakeRequest()
      .withHeaders(("Authorization", "Bearer 123"))
    val givenUser = UserDetails("ID", "exId", "Janko", "RZ")
    given(authenticationServiceMock.getUserInfo("123")).willAnswer(futureDetails(givenUser))
    val fakeBlockCaptor = new FakeBlock

    // when
    val eventualResult = objectUnderTest.invokeBlock(givenRequest, fakeBlockCaptor)

    // then
    contentAsJson(eventualResult)

    fakeBlockCaptor.argCaptured.user.isRight should be(true)
    fakeBlockCaptor.argCaptured.user.right.toOption.get should be (givenUser)
  }

  private def futureException: Answer[_] = _ => Future {
    throw new InvalidTokenException("from test")
  }

  private def futureDetails(details: UserDetails): Answer[_] = _ => Future {
    details
  }

  class FakeBlock extends (AuthenticatedRequest[_] => Future[Result]) {
    var argCaptured: AuthenticatedRequest[_] = _
    override def apply(v1: AuthenticatedRequest[_]): Future[Result] = Future {
      argCaptured = v1
      Results.Ok("true")
    }
  }
}
