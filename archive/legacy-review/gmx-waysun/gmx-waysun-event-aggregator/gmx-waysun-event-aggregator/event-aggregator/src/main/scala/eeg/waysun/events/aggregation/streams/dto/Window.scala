package eeg.waysun.events.aggregation.streams.dto

import eeg.waysun.events.aggregation.streams.dto.Window.asLong
import scala.language.implicitConversions
import java.time.OffsetDateTime
import scala.util.{Success, Try}

case class Window(startDate: OffsetDateTime, endDate: OffsetDateTime, interval: Interval, index: Long = 1) {

  val start: Long = startDate

  val end: Long = endDate

  def inWindow(time: OffsetDateTime): Boolean = inWindow(time.toInstant.toEpochMilli)

  def inWindow(time: Long): Boolean = {
    start <= time && time < end
  }

  def isWindowNumberOverLimit(maxCount: Long): Boolean = maxCount > index

  def next(newEnd: OffsetDateTime): Window = Window(endDate, newEnd, interval, index + 1)

  def howManyCyclesIsAfter(time: Long): Long = {
    val cycle = end - start
    (time - end) / cycle
  }

}
object Window {

  implicit def asLong(date: OffsetDateTime): Long = {
    def minOrMax(value: Long) = if (value < 0) {
      Long.MinValue
    } else {
      Long.MaxValue
    }

    Try(date.toInstant.toEpochMilli) match {
      case Success(value) => value
      case _              => minOrMax(date.toEpochSecond)
    }
  }
}
