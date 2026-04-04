package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user

import akka.actor.{ActorRef, ActorSystem, Props}
import akka.pattern._
import akka.stream.ActorMaterializer
import akka.testkit.{ImplicitSender, TestKit}
import akka.util.Timeout
import com.softwaremill.tagging.@@
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.EventStreamDispatcherActor
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.Messages.OpenStream
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.user.actor.UserWebsocketProviderActor
import net.flipsports.gmx.webapiclient.sbtech.betting.BettingAPIClient
import org.junit.runner.RunWith
import org.scalatest.concurrent.ScalaFutures
import org.scalatest.junit.JUnitRunner
import org.scalatest.mockito.MockitoSugar
import org.scalatest.time.{Seconds, Span}
import org.scalatest.{BeforeAndAfter, FunSuiteLike, Matchers}

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

@RunWith(classOf[JUnitRunner])
class UserWebsocketProviderActorSpec extends TestKit(ActorSystem("UserWebsocketProviderActorSpec"))
  with ImplicitSender
  with FunSuiteLike
  with Matchers
  with MockitoSugar
  with ScalaFutures
  with BeforeAndAfter {

  implicit val materializer: ActorMaterializer = ActorMaterializer()(system)
  implicit val askTimeout: Timeout = Timeout(2.seconds)
  private val flowConstructionTimeout = timeout(Span(2, Seconds))

  private var objectUnderTest: ActorRef = _

  before {
    objectUnderTest = system.actorOf(Props(new UserWebsocketProviderActor(mock[ActorRef @@ EventStreamDispatcherActor.Type], mock[BettingAPIClient])))
  }


  test("'receive()' SHOULD create distinct children WHEN multiple OpenStream request") {
    // given
    val req1 = OpenStream("1")
    val req2 = OpenStream("2")
    val req3 = OpenStream("3")

    // when
    val responses = for {
      flow1 <- objectUnderTest ? req1
      flow2 <- objectUnderTest ? req2
      flow3 <- objectUnderTest ? req3
    } yield (flow1, flow2, flow3)

    // then
    whenReady(responses, flowConstructionTimeout) { result =>
      result._1 should not be result._2
      result._1 should not be result._3
      result._2 should not be result._3
    }
  }
}
