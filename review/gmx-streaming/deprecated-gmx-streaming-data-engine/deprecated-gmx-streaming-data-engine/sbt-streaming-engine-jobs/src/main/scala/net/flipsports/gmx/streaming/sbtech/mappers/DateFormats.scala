package net.flipsports.gmx.streaming.sbtech.mappers

import java.text.SimpleDateFormat
import java.time.format.DateTimeFormatter
import java.time.{Instant, ZoneOffset, ZonedDateTime}

import com.typesafe.scalalogging.LazyLogging

import scala.language.implicitConversions

object DateFormats extends LazyLogging {
  private val sbTechDateFormat = "MM/dd/yyyy hh:mm:ss a"

  private val rewardsPointFormat = "yyyy-MM-dd'T'HH:mm:ssX"

  def zone = ZoneOffset.UTC

  def toIso(date: Long): String = DateTimeFormatter.ofPattern(rewardsPointFormat).withZone(zone).format(long2ZonedDateTime(date))

  def long2ZonedDateTime(source: Long): ZonedDateTime = Instant.ofEpochMilli(source).atZone(zone)

  implicit def instant2String(date: Instant) = new SimpleDateFormat(sbTechDateFormat).format(date)

}
