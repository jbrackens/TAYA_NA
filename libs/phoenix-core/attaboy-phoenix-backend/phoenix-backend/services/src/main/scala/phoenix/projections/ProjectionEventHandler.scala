package phoenix.projections

import scala.concurrent.Future

import akka.Done
import akka.projection.eventsourced.EventEnvelope

import phoenix.CirceAkkaSerializable

trait ProjectionEventHandler[E <: CirceAkkaSerializable] {
  def process(envelope: EventEnvelope[E]): Future[Done]
}
