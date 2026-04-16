package phoenix.support

import java.util.UUID

import akka.persistence.query.Sequence
import akka.projection.eventsourced.EventEnvelope

import phoenix.CirceAkkaSerializable
import phoenix.config.PhoenixProjectionConfig
import phoenix.projections.ProjectionEventHandler
import phoenix.projections.ProjectionRunner
import phoenix.time.FakeHardcodedClock

final class TestEventQueue[E <: CirceAkkaSerializable] extends ProjectionRunner[E] {
  private var events: List[EventEnvelope[E]] = List.empty
  private var handlers: List[ProjectionEventHandler[E]] = List.empty

  def pushEvent(event: E): Unit = {
    val envelope = EventEnvelope(
      Sequence(events.length),
      persistenceId = UUID.randomUUID().toString,
      sequenceNr = events.length,
      event = event,
      timestamp = new FakeHardcodedClock().currentOffsetDateTime().toInstant.toEpochMilli)
    events = events :+ envelope

    handlers.foreach(handler => handler.process(envelope))
  }

  override def runProjection(config: PhoenixProjectionConfig, handler: ProjectionEventHandler[E]): Unit = {
    handlers = handlers :+ handler
    events.foreach { handler.process }
  }
}

object TestEventQueue {
  def instance[E <: CirceAkkaSerializable]: TestEventQueue[E] = new TestEventQueue[E]
}
