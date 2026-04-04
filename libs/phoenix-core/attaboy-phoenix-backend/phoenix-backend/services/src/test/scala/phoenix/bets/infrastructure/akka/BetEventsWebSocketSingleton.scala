package phoenix.bets.infrastructure.akka

import akka.persistence.query.Offset
import akka.stream.scaladsl.Source
import akka.stream.testkit.scaladsl.TestSink
import org.scalatest.freespec.AnyFreeSpec
import org.scalatest.matchers.should.Matchers

import phoenix.bets.BetStateUpdate
import phoenix.bets.BetStateUpdate.TargetState
import phoenix.bets.support.BetDataGenerator
import phoenix.support.ActorSystemIntegrationSpec

class BetEventsWebSocketSingleton extends AnyFreeSpec with Matchers with ActorSystemIntegrationSpec {

  implicit val sys = system.classicSystem

  val socketFlow = BetEventsWebsocketSingleton.messageCollectorFlow

  "A BetEvents WebSocket" - {
    "should relay resettled events" in {
      // given
      val event = BetDataGenerator.generateBetResettledEvent()

      // when
      val flow = Source
        .single(event)
        .asSourceWithContext(_ => Offset.sequence(0))
        .via(socketFlow)
        .runWith(TestSink[(BetStateUpdate, Offset)]())

      // then
      val expectedUpdate = BetStateUpdate(event.betId, TargetState.Resettled, event.betData, event.winner, None)

      flow.requestNext() shouldBe ((expectedUpdate, Offset.sequence(0)))
    }
  }

}
