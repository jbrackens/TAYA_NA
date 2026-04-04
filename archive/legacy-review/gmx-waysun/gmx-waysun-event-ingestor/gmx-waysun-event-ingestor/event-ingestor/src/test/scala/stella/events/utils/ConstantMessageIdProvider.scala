package stella.events.utils

import java.util.UUID

import stella.events.MessageIdProvider

case class ConstantMessageIdProvider(id: String) extends MessageIdProvider {
  override def generateId(): String = id
}

object ConstantMessageIdProvider {
  def forRandomUuid(): ConstantMessageIdProvider = ConstantMessageIdProvider(UUID.randomUUID().toString)
}
