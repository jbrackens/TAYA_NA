package phoenix.sharding

import akka.persistence.typed.scaladsl.Effect
import akka.persistence.typed.scaladsl.ReplyEffect
import org.slf4j.LoggerFactory

import phoenix.CirceAkkaSerializable

trait ShardingCommandChecker[Command, Event <: CirceAkkaSerializable, State <: CirceAkkaSerializable] {
  private val log = LoggerFactory.getLogger(getClass)

  def checkCommandAndHandle[IdType <: PhoenixId](receivingEntityId: IdType, commandId: IdType)(
      commandHandler: () => ReplyEffect[Event, State]): ReplyEffect[Event, State] =
    if (receivingEntityId == commandId) {
      commandHandler()
    } else {
      log.error(s"Command meant for [$commandId] doesn't match receiving actor persistence id: $receivingEntityId")
      Effect.noReply
    }
}
