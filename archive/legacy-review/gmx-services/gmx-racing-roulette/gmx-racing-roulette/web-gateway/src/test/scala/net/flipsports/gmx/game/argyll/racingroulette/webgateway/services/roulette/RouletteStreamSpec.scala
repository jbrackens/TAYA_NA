package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette

import java.time.ZonedDateTime
import java.util.UUID

import akka.actor.ActorSystem
import akka.stream.ActorMaterializer
import akka.stream.scaladsl.Keep
import akka.stream.testkit.TestPublisher.Probe
import akka.stream.testkit.scaladsl.{TestSink, TestSource}
import akka.testkit.TestKit
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.EventStatus.NotStarted
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Metadata.SuccessMetadata
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Operation.EventUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.{BaseResponse, EventStateResp}
import org.junit.runner.RunWith
import org.scalatest.junit.JUnitRunner
import org.scalatest.{BeforeAndAfter, FunSuiteLike, Matchers}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class RouletteStreamSpec extends TestKit(ActorSystem("UserWebsocketProviderActorSpec"))
  with FunSuiteLike
  with Matchers
  with BeforeAndAfter {

  implicit val materializer: ActorMaterializer = ActorMaterializer()(system)

  private var objectUnderTest: RouletteStream = _

  before {
    objectUnderTest = new RouletteStream("objectUnderTest")
  }

  test("'addEventSource()' SHOULD connect Source to Stream") {
    // given
    val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

    // when
    val source = TestResponseSource.createEventSource(objectUnderTest, "123")

    sink.request(10)
    val msg1 = source.produce
    val msg2 = source.produce
    val msg3 = source.produce

    // then
    sink.expectNext(msg1)
    sink.expectNext(msg2)
    sink.expectNext(msg3)
  }

  test("'addEventSource()' SHOULD handle multiple Sources") {
    // given
    val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

    // when
    val source1 = TestResponseSource.createEventSource(objectUnderTest, "123")
    val source2 = TestResponseSource.createEventSource(objectUnderTest, "321")

    sink.request(10)
    val msg1 = source1.produce
    val msg2 = source1.produce
    val msg3 = source2.produce
    val msg4 = source2.produce

    // then
    sink.expectNextUnordered(msg1, msg2, msg3, msg4)
    sink.expectNoMessage(50.millis)
  }

  test("'unwatchEvent()' SHOULD remove Source") {
    // given
    val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

    // when
    val source1 = TestResponseSource.createEventSource(objectUnderTest, "123")
    val source2 = TestResponseSource.createEventSource(objectUnderTest, "321")

    objectUnderTest.unwatchEvent("123")

    sink.request(10)
    source1.produce
    source1.produce
    val msg3 = source2.produce
    val msg4 = source2.produce

    // then
    source1.expectTerminated()
    sink.expectNextUnordered(msg3, msg4)
    sink.expectNoMessage(50.millis)
  }

  test("'unwatchEvents()' SHOULD remove all Sources") {
    // given
    val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

    // when
    val source1 = TestResponseSource.createEventSource(objectUnderTest, "123")
    val source2 = TestResponseSource.createEventSource(objectUnderTest, "321")

    objectUnderTest.terminate()

    sink.request(10)

    // then
    source1.expectTerminated()
    source2.expectTerminated()
    sink.expectComplete()
    sink.expectNoMessage(50.millis)
  }

  test("'publishResponse()' SHOULD send single message") {
    // given
    val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

    // when
    val msg1 = TestResponseSource.generateBaseResponse("123")
    val msg2 = TestResponseSource.generateBaseResponse("567")

    sink.request(10)
    objectUnderTest.publishResponse(Future.successful(msg1))
    objectUnderTest.publishResponse(Future.successful(msg2))

    // then
    sink.expectNextUnordered(msg1, msg2)
    sink.expectNoMessage(50.millis)
  }
}

class TestResponseSource(id: String, probe: Probe[BaseResponse]) {
  def produce: EventStateResp = {
    val elem = TestResponseSource.generateBaseResponse(id)
    probe.sendNext(elem)
    elem
  }

  def expectTerminated(): Unit = {
    probe.expectCancellation()
  }
}

object TestResponseSource {
  def createEventSource(target: RouletteStream, id: String)(implicit system: ActorSystem): TestResponseSource = {
    val probe = target.addEventSource(id, TestSource.probe[BaseResponse])
    new TestResponseSource(id, probe)
  }

  def generateBaseResponse(id: String): EventStateResp = {
    EventStateResp(SuccessMetadata(Some(UUID.randomUUID().toString), EventUpdate, id, 1), "Warsaw", ZonedDateTime.now(), NotStarted, Seq())
  }
}

