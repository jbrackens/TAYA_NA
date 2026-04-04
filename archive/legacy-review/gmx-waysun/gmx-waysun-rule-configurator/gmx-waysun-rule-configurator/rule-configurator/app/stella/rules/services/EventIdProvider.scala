package stella.rules.services

import stella.rules.models.Ids.EventConfigurationEventId

trait EventIdProvider {
  def generateId(): EventConfigurationEventId
}

object RandomUuidEventIdProvider extends EventIdProvider {
  override def generateId(): EventConfigurationEventId = EventConfigurationEventId.random()
}
