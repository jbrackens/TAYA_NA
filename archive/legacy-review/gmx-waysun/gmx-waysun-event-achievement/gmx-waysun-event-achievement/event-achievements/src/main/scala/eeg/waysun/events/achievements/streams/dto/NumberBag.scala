package eeg.waysun.events.achievements.streams.dto

class NumberBag[T](val aggregate: T, val achievementDefinition: T) {
  def groupByFieldValueVanilla(): String = aggregate.toString
}
