package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data

import akka.NotUsed
import akka.actor.{ActorRef, ActorSystem}
import akka.event.{Logging, LoggingAdapter}
import akka.stream.Materializer
import akka.stream.scaladsl.{Flow, Sink, Source}
import com.softwaremill.tagging.@@
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.Elements.StateUpdate
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.EventSource
import net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.event.stream.{EventStreamDispatcherActor, StreamLifecycle}

class ChangeWatcher(eventStreamDispatcher: ActorRef @@ EventStreamDispatcherActor.Type)
                   (implicit system: ActorSystem, mat: Materializer) {

  implicit val logger: LoggingAdapter = Logging(system, this.getClass)

  protected def ackUpdateDispatcher: Sink[StateUpdate, Any] = Sink.actorRefWithAck[StateUpdate](
    eventStreamDispatcher,
    onInitMessage = StreamLifecycle.StreamInitialized,
    ackMessage = StreamLifecycle.Ack,
    onCompleteMessage = StreamLifecycle.StreamCompleted
  )

  protected def burstUpdateDispatcher: Sink[StateUpdate, Any] = Sink.actorRef[StateUpdate](
    eventStreamDispatcher,
    onCompleteMessage = StreamLifecycle.StreamCompleted
  )

  protected def backpressureBuffer: Flow[StateUpdate, StateUpdate, NotUsed] = Flow[StateUpdate]
    .batch(1000, u => {
      logger.debug(s"BACKPRESSURE ON - starting")
      List(u)
    })((acc, elem) => {
      logger.debug(s"BACKPRESSURE ON - buffered elements: ${acc.size + 1}")
      elem :: acc
    })
    .flatMapConcat(seq => {
      logger.debug(s"BACKPRESSURE OFF - received elements: ${seq.size}")
      Source(seq.reverse)
    })

  def buildFromSource(eventSource: EventSource): Any = {
    eventSource.provide
      .via(backpressureBuffer)
      .to(ackUpdateDispatcher)
      .named("flow-changeWatcher")
      .run()
  }

}