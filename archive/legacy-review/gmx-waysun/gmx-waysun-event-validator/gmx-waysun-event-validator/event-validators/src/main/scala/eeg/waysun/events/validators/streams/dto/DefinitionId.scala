package eeg.waysun.events.validators.streams.dto

case class DefinitionId(projectId: String, eventDefinitionRuleId: String, eventName: Option[String] = None)
