package eeg.waysun.events.achievements.conditions

import stella.dataapi.aggregation.AggregationValues
import eeg.waysun.events.achievements.Types.{AggregatedType, DefinitionType}
import eeg.waysun.events.achievements.operations
import eeg.waysun.events.achievements.operations.AggregationFunctions
import eeg.waysun.events.achievements.streams.dto.NumberBag

case class AchievementConditionValueMatchCheck(condition: DefinitionType.ConditionType, event: AggregatedType.Wrapped)
    extends Check {

  override def check: Boolean = {
    val aggregate = event.value.get

    val expectedFieldValueVanilla: String = condition.getValue.toString
    val expectedFieldNameVanilla: String = condition.getAggregationField.toString.toLowerCase

    val aggregationValues = aggregate.getAggregations

    if (AggregationFunctions.all.contains(expectedFieldNameVanilla)) {
      compareAggregationFunctions(aggregationValues, expectedFieldValueVanilla, expectedFieldNameVanilla)
    } else {
      false
    }
  }

  private def compareAggregationFunctions(
      aggregationValues: AggregationValues,
      expectedFieldValueVanilla: String,
      expectedFieldNameVanilla: String): Boolean = {
    val precisionBasedOp = expectedFieldNameVanilla match {
      case AggregationFunctions.sum =>
        Left(new NumberBag[Float](aggregationValues.getSum, expectedFieldValueVanilla.toFloat))
      case AggregationFunctions.min =>
        Left(new NumberBag[Float](aggregationValues.getMin, expectedFieldValueVanilla.toFloat))
      case AggregationFunctions.max =>
        Left(new NumberBag[Float](aggregationValues.getMax, expectedFieldValueVanilla.toFloat))
      case AggregationFunctions.count =>
        Right(new NumberBag[Int](aggregationValues.getCount, expectedFieldValueVanilla.toInt))
    }

    val achievementsMatch = operations.compare(precisionBasedOp, condition.conditionType)

    achievementsMatch._1.matchedCondition
  }
}
