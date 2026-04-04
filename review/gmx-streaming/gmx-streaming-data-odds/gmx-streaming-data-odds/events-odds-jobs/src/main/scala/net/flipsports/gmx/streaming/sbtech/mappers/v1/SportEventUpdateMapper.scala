package net.flipsports.gmx.streaming.sbtech.mappers.v1

import com.typesafe.scalalogging.LazyLogging
import gmx.dataapi.internal.siteextensions.SportEventUpdateType
import net.flipsports.gmx.streaming.common.conversion.DateFormats
import net.flipsports.gmx.streaming.sbtech.SportEventsTypes
import org.apache.flink.api.java.tuple.Tuple2

import java.util.UUID

object SportEventUpdateMapper extends LazyLogging {

  def as(id: String, eventType: SportEventUpdateType, messageOriginDate: Long)(payload: => AnyRef): SportEventsTypes.SportEventUpdate.Source = {
    val key = new SportEventsTypes.SportEventUpdate.KeyType()
    key.setId(id)
    key.setType(eventType)
    val value = new SportEventsTypes.SportEventUpdate.ValueType()
    value.setMessageOriginDateUTC(DateFormats.withAddedTimeAtUtc(messageOriginDate).toInstant.toEpochMilli)
    value.setMessageProcessingDateUTC(DateFormats.nowEpochInMiliAtUtc())
    value.setMessageId(UUID.randomUUID().toString)
    value.setPayload(payload)
    new Tuple2(key, value)
  }

  def asNull(id: String, eventType: SportEventUpdateType): SportEventsTypes.SportEventUpdate.Source = {
    val key = new SportEventsTypes.SportEventUpdate.KeyType()
    key.setId(id)
    key.setType(eventType)
    new Tuple2(key, null)
  }

  def keyed[K, V](key: K, value: V): Tuple2[K, V] = new Tuple2[K, V](key, value)
}