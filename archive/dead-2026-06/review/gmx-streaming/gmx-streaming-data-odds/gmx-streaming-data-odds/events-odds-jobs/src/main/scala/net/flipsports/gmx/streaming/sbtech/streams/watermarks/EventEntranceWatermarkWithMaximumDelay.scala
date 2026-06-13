package net.flipsports.gmx.streaming.sbtech.streams.watermarks

import org.apache.flink.streaming.api.functions.AssignerWithPeriodicWatermarks
import org.apache.flink.streaming.api.watermark.Watermark

abstract class EventEntranceWatermarkWithMaximumDelay[T](maximumDelay: Long = lag) extends  AssignerWithPeriodicWatermarks[T] {

  override def getCurrentWatermark: Watermark = watermarksWithLag(maximumDelay)

  override def extractTimestamp(element: T, previousElementTimestamp: Long): Long = defaultTimestampUtc()
}
