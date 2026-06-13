package net.flipsports.gmx.streaming.common.job.streams.dto

import net.flipsports.gmx.streaming.common.job.streams.dto.FTuple.FTuple2


case class KeyValue[K, V](key: K, value: V) {

  def isValueNull(): Boolean = value == null

}

object KeyValue {

  def fromTuple[K, V](source: (K, V)): KeyValue[K, V] = KeyValue(source._1, source._2)

  def fromTuple2[K, V](source: FTuple2[K, V]): KeyValue[K, V] = KeyValue(source.f0, source.f1)

  implicit class AsKeyedValue[K, V](val event: (K, V)) {
    def wrapped: KeyValue[K, V] = fromTuple(event)
  }

}
