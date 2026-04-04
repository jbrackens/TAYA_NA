package tech.argyll.gmx.predictorgame.services.auth

import org.junit.runner.RunWith
import org.scalatest.FunSuite
import org.scalatest.Matchers._
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import play.api.mvc.BodyParsers
import tech.argyll.gmx.predictorgame.security.auth.IAuthenticationService

import scala.concurrent.ExecutionContext.Implicits.global

@RunWith(classOf[JUnitRunner])
class IAuthenticatedActionTest extends FunSuite with MockitoSugar {

  private val objectUnderTest = new AuthenticatedAction(mock[BodyParsers.Default], mock[IAuthenticationService])(global)

  test("'extractToken()' should find value for valid Bearer") {
    // given

    // when
    val actual = objectUnderTest.extractToken("Bearer Amadnf349j120jrsdkaf-0")

    // then
    actual should be("Amadnf349j120jrsdkaf-0")
  }

}
