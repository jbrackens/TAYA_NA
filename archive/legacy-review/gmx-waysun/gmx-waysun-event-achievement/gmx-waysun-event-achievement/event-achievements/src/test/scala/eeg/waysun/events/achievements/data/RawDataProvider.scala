package eeg.waysun.events.achievements.data

import eeg.waysun.events.achievements.Types.AggregatedType
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import stella.dataapi.aggregation.AggregationValues

import java.util.UUID

object RawDataProvider extends DataProvider[(AggregatedType.KeyType, AggregatedType.ValueType), Unit] {

  override def buildFake(
      item: Int,
      aggregationRuleId: String,
      projectId: String = UUID.randomUUID().toString,
      payloadData: Option[Seq[Unit]] = None): (AggregatedType.KeyType, AggregatedType.ValueType) = {

    val key = new AggregatedType.KeyType()
    key.setAggregationRuleId(aggregationRuleId)
    key.setProjectId(projectId)
    key.setGroupByFieldValue(s"groupbyfieldvalue-$item")

    val value = new AggregatedType.ValueType()
    value.setWindowRangeStartUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setWindowRangeEndUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setAggregations(new AggregationValues(0f, 0f, 1, 0f, "0"))
    (key, value)
  }
}
