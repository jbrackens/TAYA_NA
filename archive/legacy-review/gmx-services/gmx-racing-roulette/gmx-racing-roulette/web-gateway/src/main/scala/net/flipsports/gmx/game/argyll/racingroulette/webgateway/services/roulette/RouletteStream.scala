package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.roulette

import akka.actor.{ActorRef, ActorSystem}
import akka.event.{Logging, LoggingAdapter}
import akka.pattern.pipe
import akka.stream.scaladsl.{BroadcastHub, Flow, Keep, MergeHub, RunnableGraph, Source}
import akka.stream.{KillSwitches, Materializer, OverflowStrategy, UniqueKillSwitch}
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.api.Response.BaseResponse

import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}

class RouletteStream(name: String)
                    (implicit system: ActorSystem, mat: Materializer, ec: ExecutionContext) {

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)

  private val sharedKillSwitch = KillSwitches.shared(s"killswitch-$name")

  /**
   * Main Flow:
   * manual -> |       |    |           | -> out (ws)
   * event1 -> | MERGE | -> | BROADCAST | -> ..
   * event2 -> |       |    |           |
   * ...
   *
   * - Manual producer allows to insert responses to client requests to stream
   * - EventX producer emits EventSnapshot on every received change. It's allowed to subscribe to many events on same WS connection
   *
   */
  private val (responseIn, responseOut) = MergeHub.source[BaseResponse]
    .log(name)
    .via(sharedKillSwitch.flow)
    .toMat(BroadcastHub.sink)(Keep.both)
    .named(s"$name-mainHUB")
    .run()

  /**
   * All responses to WS requests are emitted to this Source
   */
  private val wsResponsesPublisher: ActorRef = Source.actorRef[BaseResponse](Int.MaxValue, OverflowStrategy.dropHead)
    .to(responseIn)
    .named(s"$name-responses")
    .run()

  /**
   * Contains all killSwitches for all connected eventX streams. Used to unsubscribe from specific updates
   */
  private var watchedEvents: Map[String, UniqueKillSwitch] = Map.empty

  def broadcastOutput: Source[BaseResponse, Any] = {
    responseOut
  }

  /**
   * Adds Event updates stream to WSFlow. If the event was already added remove previous source.
   */
  def addEventSource[T](eventId: String, eventUpdates: Source[BaseResponse, T]): T = {
    unwatchEvent(eventId)

    val killswitchFlow = buildKillSwitch()

    val graph: RunnableGraph[(T, UniqueKillSwitch)] =
      eventUpdates
        .viaMat(killswitchFlow)(Keep.both)
        .to(responseIn)
        .named(s"flow-$name-event-$eventId")

    val (matSource, killSwitch) = graph.run()
    watchedEvents += (eventId -> killSwitch)
    matSource
  }

  private def buildKillSwitch() =
    Flow.apply[BaseResponse]
      .joinMat(KillSwitches.singleBidi[BaseResponse, BaseResponse])(Keep.right)
      .backpressureTimeout(1.seconds)

  def unwatchEvent(eventId: String): Unit = {
    watchedEvents.get(eventId).foreach { killSwitch =>
      killSwitch.shutdown()
    }
  }

  def terminate(): Unit = {
    watchedEvents.values.foreach { killSwitch =>
      killSwitch.shutdown()
    }

    sharedKillSwitch.shutdown()
  }

  def publishResponse(result: Future[BaseResponse]): Unit = {
    pipe(result) to wsResponsesPublisher
  }
}
