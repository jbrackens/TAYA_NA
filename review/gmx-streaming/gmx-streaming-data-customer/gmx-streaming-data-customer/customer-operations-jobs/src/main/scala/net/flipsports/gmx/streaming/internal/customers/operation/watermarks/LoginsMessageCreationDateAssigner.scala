package net.flipsports.gmx.streaming.internal.customers.operation.watermarks

import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins
import net.flipsports.gmx.streaming.internal.customers.operation.Types.Logins.{KeyType, ValueType}
import net.flipsports.gmx.streaming.internal.customers.operation.configs.Constants
import net.flipsports.gmx.streaming.internal.customers.operation.mappers.v1.DateFormats
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

private class LoginsMessageCreationDateAssigner extends AssignerWithPeriodicWatermarks[Tuple2[Logins.KeyType, Logins.ValueType]]() {

  override def getCurrentWatermark(): Watermark = new Watermark(DateFormats.nowEpochInMiliAtUtc() - Constants.watermarkMaxLag)

  override def extractTimestamp(element: Tuple2[KeyType, ValueType], previousElementTimestamp: Long): Long = element.f1.getMessageCreationDate
}

object LoginsMessageCreationDateAssigner {

  def apply(): AssignerWithPeriodicWatermarks[Tuple2[Logins.KeyType, Logins.ValueType]] = new LoginsMessageCreationDateAssigner()
}
