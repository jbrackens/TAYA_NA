package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user

import akka.actor.{ActorRef, ActorSystem, PoisonPill, Props}
import akka.pattern._
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.{Flow, Keep, Sink}
import akka.stream.testkit.scaladsl.TestSource
import akka.testkit.{EventFilter, ImplicitSender, TestKit, TestProbe}
import akka.util.Timeout
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.RequestMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.SubscribeEvent
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Request.{BaseRequest, SubscribeEventReq}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response._
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette.RouletteEngine
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.Messages.OpenStream
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.UserWebsocketActor
import org.junit.runner.RunWith
import org.mockito.ArgumentMatchers
import org.mockito.BDDMockito.{`then`, given}
import org.mockito.Mockito.times
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.time.{Seconds, Span}
import org.scalatest.{BeforeAndAfter, FunSuiteLike, Matchers}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class UserWebsocketActorSpec extends TestKit(ActorSystem("UserWebsocketActorSpec"))
  with ImplicitSender
  with FunSuiteLike
  with Matchers
  with MockitoSugar
  with ScalaFutures
  with BeforeAndAfter {

  implicit val materializer: ActorMaterializer = ActorMaterializer()(system)
  implicit val askTimeout: Timeout = Timeout(2.seconds)
  private val flowConstructionTimeout = timeout(Span(2, Seconds))

  private var rouletteEngineMock: RouletteEngine = _
  private var objectUnderTest: ActorRef = _

  before {
    rouletteEngineMock = mock[RouletteEngine]
    given(rouletteEngineMock.responsesSource).willReturn(TestSource.probe[BaseResponse])

    objectUnderTest = system.actorOf(Props(new UserWebsocketActor("testActor", rouletteEngineMock)))
  }

  test("'receive()' SHOULD return same Flow WHEN multiple OpenStream request") {
    // given
    val req1 = OpenStream("1")
    val req2 = OpenStream("2")
    val req3 = OpenStream("3")

    // when
    val responses = for {
      flow1 <- (objectUnderTest ? req1).mapTo[Flow[BaseRequest, BaseResponse, _]]
      flow2 <- (objectUnderTest ? req2).mapTo[Flow[BaseRequest, BaseResponse, _]]
      flow3 <- (objectUnderTest ? req3).mapTo[Flow[BaseRequest, BaseResponse, _]]
    } yield (flow1, flow2, flow3)

    // then
    whenReady(responses, flowConstructionTimeout) { result =>
      result._1 should be(result._2)
      result._1 should be(result._3)
    }
  }

  test("'receive()' SHOULD handle unsupported request") {
    // given
    case class UnsupportedMessage()
    val req1 = UnsupportedMessage

    // when
    EventFilter.debug(start = "received handled message UnsupportedMessage", occurrences = 1).intercept {
      objectUnderTest ! req1
    }
  }

  test("'receive()' SHOULD send message to Engine WHEN BaseRequest request") {
    // given
    val req1 = SubscribeEventReq(RequestMetadata(Some("1"), SubscribeEvent, "123"))

    // when
    EventFilter.debug(start = "received handled message SubscribeEventReq", occurrences = 1).intercept {
      objectUnderTest ! req1
    }

    `then`(rouletteEngineMock).should(times(1)).handleRequest(ArgumentMatchers.eq(req1))
  }

  test("returned Flow SHOULD send pass message via 'receive()' to Engine WHEN BaseRequest request") {
    // given
    val req1 = OpenStream("1")
    val req2 = SubscribeEventReq(RequestMetadata(Some("1"), SubscribeEvent, "123"))
    val testSource = TestSource.probe[BaseRequest]
    val testSink = Sink.ignore

    // when
    val actual = (objectUnderTest ? req1).mapTo[Flow[BaseRequest, BaseResponse, _]]

    // then
    whenReady(actual, flowConstructionTimeout) { flow =>
      val runningFlow = testSource.via(flow).toMat(testSink)(Keep.left).run()
      EventFilter.debug(start = "received handled message SubscribeEventReq", occurrences = 1).intercept {
        runningFlow.sendNext(req2)
      }

      `then`(rouletteEngineMock).should(times(1)).handleRequest(ArgumentMatchers.eq(req2))
    }
  }

  test("returned Flow SHOULD stop Actor WHEN terminated") {
    // given
    val req1 = OpenStream("1")
    val testSource = TestSource.probe[BaseRequest]
    val testSink = Sink.ignore

    // when
    val actual = (objectUnderTest ? req1).mapTo[Flow[BaseRequest, BaseResponse, _]]

    // then
    whenReady(actual, flowConstructionTimeout) { flow =>
      val runningFlow = testSource.via(flow).toMat(testSink)(Keep.left).run()

      val probe = TestProbe()
      probe.watch(objectUnderTest)

      runningFlow.sendComplete()
      probe.expectTerminated(objectUnderTest)
    }
  }

  test("'postStop()' SHOULD terminate Engine") {
    // given
    val req1 = OpenStream("1")

    // when
    val actual = (objectUnderTest ? req1).mapTo[Flow[BaseRequest, BaseResponse, _]]

    // then
    whenReady(actual, flowConstructionTimeout) { flow =>
      EventFilter.info(start = "Stopping actor", occurrences = 1).intercept {
        objectUnderTest ! PoisonPill
      }

      `then`(rouletteEngineMock).should(times(1)).terminate()
    }
  }
}
