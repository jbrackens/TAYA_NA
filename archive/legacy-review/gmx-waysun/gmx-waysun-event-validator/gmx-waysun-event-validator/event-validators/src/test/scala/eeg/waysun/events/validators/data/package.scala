package eeg.waysun.events.validators

import eeg.waysun.events.validators.Types.{Definition, Raw}

package object data {

  implicit class FromRawSourceKey(event: (Raw.SourceKeyType, Raw.ValueType)) {

    def toInternalKey(): (Raw.KeyType, Raw.ValueType) = {
      val key = new Raw.KeyType(
        projectId = event._1.getProjectId.toString,
        eventName = event._2.getEventName.toString,
        userId = event._1.getUserId.toString)
      (key, event._2)
    }
  }

  implicit class FromDefinitionSourceKey(event: (Definition.SourceKeyType, Definition.ValueType)) {

    def toInternalKey(): (Definition.KeyType, Definition.ValueType) = {
      val key = new Definition.KeyType(
        projectId = event._1.getProjectId.toString,
        eventDefinitionRuleId = event._1.getEventId.toString,
        eventName = Some(event._1.getName.toString))
      (key, event._2)
    }
  }
}
