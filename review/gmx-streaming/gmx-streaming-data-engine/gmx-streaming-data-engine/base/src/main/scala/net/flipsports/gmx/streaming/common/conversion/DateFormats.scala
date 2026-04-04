package net.flipsports.gmx.streaming.common.conversion

import com.typesafe.scalalogging.LazyLogging

import java.time.format.DateTimeFormatter
import java.time.{Instant, OffsetDateTime, ZoneOffset, ZonedDateTime}


object DateFormats extends LazyLogging {

  private val rewardsPointFormat = "yyyy-MM-dd'T'HH:mm:ssX"

  private val withTimeMultiplier = 1000

  def zone: ZoneOffset = ZoneOffset.UTC

  def toIso(date: Long): String = DateTimeFormatter.ofPattern(rewardsPointFormat).withZone(zone).format(long2ZonedDateTime(date))

  def long2ZonedDateTime(source: Long): ZonedDateTime = Instant.ofEpochMilli(source).atZone(zone)

  def withAddedTimeAtUtc(source: Long): ZonedDateTime = Instant.ofEpochMilli(source * withTimeMultiplier).atZone(ZoneOffset.UTC)

  def nowEpochInMiliAtUtc(): Long = Instant.now().atZone(ZoneOffset.UTC).toInstant.toEpochMilli

  def nowOffsetTimeAtUtc(): OffsetDateTime =  OffsetDateTime.now(ZoneOffset.UTC)
}
