package tech.argyll.gmx.predictorgame.security.auth.rmx

import java.time.{LocalDateTime, ZoneOffset}

import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers.any
import org.mockito.BDDMockito._
import org.mockito.Mockito.times
import org.mockito.MockitoSugar.mock
import org.mockito.{ArgumentMatchers, Mockito}
import org.scalatest.Matchers._
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.junit.JUnitRunner
import org.scalatest.time._
import org.scalatest.{BeforeAndAfterEach, FunSuite}
import tech.argyll.gmx.predictorgame.security.auth.config._

import scala.concurrent.ExecutionContext.Implicits._
import scala.concurrent.Future

@RunWith(classOf[JUnitRunner])
class OIDCClientTest extends FunSuite with BeforeAndAfterEach with ScalaFutures {

  implicit val defaultPatienceConfig =
    PatienceConfig(timeout = Span(1, Seconds), interval = Span(50, Millis))

  private val rmxConfigMock = mock[RMXConfig]
  private val authenticatorMock = mock[OIDCUserAuthenticator]

  override protected def beforeEach() =
    initDefaults()

  test("'acquireTechUserToken()' should authenticate with configured values") {
    // given
    val givenConfig = new RMXConfig("url", "client", "pass", "techUser", "techUserPass")
    val objectUnderTest = new OIDCClient(givenConfig, authenticatorMock)
    given(authenticatorMock.authenticateUser(any(), any()))
      .willReturn(OIDCToken("token", LocalDateTime.now().plusDays(1).toEpochSecond(ZoneOffset.UTC) * 1000, 0))
      .willThrow(new IllegalStateException("Some failure"))

    // when
    val actualF = objectUnderTest.acquireTechUserToken()

    // then
    whenReady(actualF) {
      actual => {
        actual should be("token")

        `then`(authenticatorMock).should(times(1))
          .authenticateUser(ArgumentMatchers.eq(givenConfig.userName), ArgumentMatchers.eq(givenConfig.userPassword))
      }
    }
  }

  test("'acquireTechUserToken()' should cache result") {
    // given
    val objectUnderTest = new OIDCClient(rmxConfigMock, authenticatorMock)
    given(authenticatorMock.authenticateUser(any(), any()))
      .willReturn(OIDCToken("token", LocalDateTime.now().plusDays(1).toEpochSecond(ZoneOffset.UTC) * 1000, 0))
      .willThrow(new IllegalStateException("Some failure"))

    // when
    val actualF = for {
      call1 <- objectUnderTest.acquireTechUserToken()
      call2 <- objectUnderTest.acquireTechUserToken()
    } yield call2

    // then
    whenReady(actualF) {
      actual => {
        actual should be("token")

        `then`(authenticatorMock).should(times(1)).authenticateUser(any(), any())
      }
    }
  }

  test("'acquireTechUserToken()' should cache based on expiration period") {
    val objectUnderTest = new OIDCClient(rmxConfigMock, authenticatorMock)
    given(authenticatorMock.authenticateUser(any(), any()))
      .willReturn(OIDCToken("token", 1, 0))
      .willReturn(OIDCToken("token2", 1, 0))

    // when
    val actualF = for {
      call1 <- objectUnderTest.acquireTechUserToken()
      wait <- Future.successful(Thread.sleep(200))
      call2 <- objectUnderTest.acquireTechUserToken()
    } yield call2

    // then
    whenReady(actualF) {
      actual => {
        actual should be("token2")

        `then`(authenticatorMock).should(times(2)).authenticateUser(any(), any())
      }
    }
  }


  private def initDefaults(): Unit = {
    Mockito.reset(rmxConfigMock, authenticatorMock)
  }
}
