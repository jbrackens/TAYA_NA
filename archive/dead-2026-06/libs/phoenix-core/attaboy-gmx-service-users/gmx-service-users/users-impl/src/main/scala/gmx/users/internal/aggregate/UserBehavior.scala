package gmx.users.internal.aggregate

import akka.actor.typed.Behavior
import akka.cluster.sharding.typed.scaladsl._
import akka.persistence.typed.PersistenceId
import akka.persistence.typed.scaladsl.EventSourcedBehavior
import com.lightbend.lagom.scaladsl.persistence.AkkaTaggerAdapter
import gmx.users.internal.logic.{ CommandHandlers, EventHandlers }

object UserBehavior {

  /**
   * Given a sharding [[EntityContext]] this function produces an Akka [[Behavior]] for the aggregate.
   */
  def create(
      entityContext: EntityContext[CommandEnvelope]
    ): Behavior[CommandEnvelope] = {
    val persistenceId: PersistenceId =
      PersistenceId(entityContext.entityTypeKey.name, entityContext.entityId)

    create(persistenceId).withTagger(
      // Using Akka Persistence Typed in Lagom requires tagging your events
      // in Lagom-compatible way so Lagom ReadSideProcessors and TopicProducers
      // can locate and follow the event streams.
      AkkaTaggerAdapter.fromLagom(entityContext, UserEvent.Tag)
    )
  }

  /**
   * This method is extracted to write unit tests that are completely independent to Akka Cluster.
   */
  private[internal] def create(persistenceId: PersistenceId) =
    EventSourcedBehavior.withEnforcedReplies[CommandEnvelope, UserEvent, UserState](
      persistenceId = persistenceId,
      emptyState = UserState.initial(persistenceId.id),
      commandHandler = (state, cmd) => CommandHandlers.applyCommand(cmd, state),
      eventHandler = (state, evt) => EventHandlers.applyEvent(evt, state)
    )

}
