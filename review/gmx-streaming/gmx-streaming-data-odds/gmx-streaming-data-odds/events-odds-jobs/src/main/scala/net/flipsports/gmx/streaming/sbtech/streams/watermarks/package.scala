package net.flipsports.gmx.streaming.sbtech.streams

import org.apache.flink.streaming.api.watermark.Watermark
import net.flipsports.gmx.streaming.common.conversion.DateFormats

package object watermarks {

  val lag: Long = 1000

  def watermarksWithLag(delay: Long): Watermark = new Watermark(DateFormats.nowEpochInMiliAtUtc() - delay)

  def defaultTimestampUtc(): Long = DateFormats.nowEpochInMiliAtUtc()
}
