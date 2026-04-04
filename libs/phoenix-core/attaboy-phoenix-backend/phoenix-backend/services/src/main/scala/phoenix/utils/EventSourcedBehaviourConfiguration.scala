package phoenix.utils

import scala.concurrent.duration._

import akka.actor.typed.SupervisorStrategy
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import akka.persistence.typed.scaladsl.RetentionCriteria

object EventSourcedBehaviourConfiguration {
  def enrichWithCommonPersistenceConfiguration[Command, Event, State](
      behaviour: EventSourcedBehavior[Command, Event, State]): EventSourcedBehavior[Command, Event, State] =
    behaviour
      .withRetention(RetentionCriteria.snapshotEvery(numberOfEvents = 10, keepNSnapshots = 3))
      .onPersistFailure(SupervisorStrategy.restartWithBackoff(200.millis, 5.seconds, 0.1))
}
