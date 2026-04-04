package stella.events

import java.util.UUID

trait MessageIdProvider {
  def generateId(): String
}

object RandomUuidMessageIdProvider extends MessageIdProvider {
  override def generateId(): String = UUID.randomUUID().toString
}
