package phoenix.core.websocket

import scala.concurrent.ExecutionContext
import scala.concurrent.Future
import scala.concurrent.duration._

import akka.actor.ActorSystem
import akka.actor.testkit.typed.scaladsl.ActorTestKit
import akka.actor.testkit.typed.scaladsl.ActorTestKitBase
import akka.actor.typed.scaladsl.adapter._
import akka.stream.Materializer
import akka.stream.scaladsl.Keep
import akka.stream.testkit.TestPublisher.Probe
import akka.stream.testkit.scaladsl.TestSink
import akka.stream.testkit.scaladsl.TestSource
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.should.Matchers
import org.scalatest.wordspec.AnyWordSpecLike

import phoenix.core.domain.DataProvider
import phoenix.core.websocket.BaseResponse.BaseResponse
import phoenix.markets.MarketsBoundedContext
import phoenix.support.TestUtils

class MultiChannelStreamSpec extends AnyWordSpecLike with Matchers with BeforeAndAfterAll {

  val testKit: ActorTestKit = ActorTestKit()
  implicit val system: ActorSystem = testKit.system.classicSystem
  implicit val materializer: Materializer = Materializer.matFromSystem(system)
  implicit val executionContext: ExecutionContext = system.dispatcher

  override protected def afterAll(): Unit = {
    materializer.shutdown()
    testKit.shutdownTestKit()
    super.afterAll()
  }

  "A MultiChannelStream" should {
    "connect Source to Stream with 'subscribe()'" in {
      withMultiChannelStream { objectUnderTest =>
        // given
        val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

        // when
        val source = TestResponseSource.createSource(objectUnderTest, "123")

        sink.request(10)
        val msg1 = source.produce
        val msg2 = source.produce
        val msg3 = source.produce

        // then
        sink.expectNext(msg1)
        sink.expectNext(msg2)
        sink.expectNext(msg3)
      }
    }

    "handle multiple Sources with 'subscribe()'" in {
      withMultiChannelStream { objectUnderTest =>
        // given
        val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

        // when
        val source1 = TestResponseSource.createSource(objectUnderTest, "123")
        val source2 = TestResponseSource.createSource(objectUnderTest, "321")

        sink.request(10)
        val msg1 = source1.produce
        val msg2 = source1.produce
        val msg3 = source2.produce
        val msg4 = source2.produce

        // then
        sink.expectNextUnordered(msg1, msg2, msg3, msg4)
        sink.expectNoMessage(50.millis)
      }
    }

    "remove Source with 'unsubscribe()'" in {
      withMultiChannelStream { objectUnderTest =>
        // given
        val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

        // when
        val source1 = TestResponseSource.createSource(objectUnderTest, "123")
        val source2 = TestResponseSource.createSource(objectUnderTest, "321")

        objectUnderTest.unsubscribe("123")

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
    }

    "remove all Sources with 'terminate()'" in {
      withMultiChannelStream { objectUnderTest =>
        // given
        val sink = objectUnderTest.broadcastOutput.toMat(TestSink.probe[BaseResponse])(Keep.right).run()

        // when
        val source1 = TestResponseSource.createSource(objectUnderTest, "123")
        val source2 = TestResponseSource.createSource(objectUnderTest, "321")

        objectUnderTest.terminate()

        sink.request(10)

        // then
        source1.expectTerminated()
        source2.expectTerminated()
        sink.expectComplete()
        sink.expectNoMessage(50.millis)
      }
    }

    "send single message with 'publishResponse()'" in {
      withMultiChannelStream { objectUnderTest =>
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
  }

  private[this] def withMultiChannelStream(f: MultiChannelStream[BaseResponse] => Any): Unit = {
    val actorTestKit = ActorTestKit(ActorTestKitBase.testNameFromCallStack())
    val stream = new MultiChannelStream[BaseResponse]("objectUnderTest")
    f(stream)
    stream.terminate()
    actorTestKit.shutdownTestKit()
    TestUtils.testCleanUp(actorTestKit.system)
  }
}

/**
 * This test was written before the migration from Jackson to Circe.
 *
 * If BaseResponse were to exist here, it would have to extend [[phoenix.CirceAkkaSerializable]], because it is used as generic argument for type [[MultiChannelStream]].
 *
 * Therefore it would have to be registered in [[phoenix.core.serialization.PhoenixCirceAkkaSerializer]] as stated in the documentation, but It wouldn't be able to, because it would be declared here, in the test code, and a serializer is declared in production code.
 *
 * To solve this paradox, the [[BaseResponse]] class was changed to type alias of [[phoenix.markets.MarketProtocol.Commands.CheckIfMarketExists]].
 * This is a hack. These classes had nothing in common besides having a similar signature.
 *
 * Omitting this hack result in serializer logging long error messages every few tests, as it detects that it doesn't know how to serialize the BaseResponse class.
 */
object BaseResponse {
  type BaseResponse = phoenix.markets.MarketProtocol.Commands.CheckIfMarketExists
}

class TestResponseSource(id: String, probe: Probe[BaseResponse])(implicit system: ActorSystem) {
  def produce: BaseResponse = {
    val elem = TestResponseSource.generateBaseResponse(id)
    probe.sendNext(elem)
    elem
  }

  def expectTerminated(): Unit = {
    probe.expectCancellation()
  }
}

object TestResponseSource {
  def createSource(target: MultiChannelStream[BaseResponse], id: String)(implicit
      system: ActorSystem): TestResponseSource = {
    val probe = target.subscribe(id, TestSource.probe[BaseResponse])
    new TestResponseSource(id, probe)
  }

  def generateBaseResponse(id: String)(implicit system: ActorSystem): BaseResponse = {
    new BaseResponse(MarketsBoundedContext.MarketId(DataProvider.Oddin, id), system.deadLetters)
  }
}
