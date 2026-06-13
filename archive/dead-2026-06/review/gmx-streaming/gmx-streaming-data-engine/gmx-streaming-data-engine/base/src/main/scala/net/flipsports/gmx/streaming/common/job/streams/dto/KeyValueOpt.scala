package net.flipsports.gmx.streaming.common.job.streams.dto

import net.flipsports.gmx.streaming.common.job.streams.dto.FTuple.FTuple2


case class KeyValueOpt[K, V](key: K, value: Option[V]){
  def isRemoved: Boolean = value match {
    case Some(i) => isValueNull(i)
    case None => true
  }
}


object KeyValueOpt {

  def fromTuple[K, V](source: (K, V)): KeyValueOpt[K, V] = if (isValueNull(source)) {
    KeyValueOpt(source._1, None)
  } else {
    KeyValueOpt(source._1, Some(source._2))
  }

  def fromTuple2[K, V](source: FTuple2[K, V]): KeyValueOpt[K, V] = if (isValueNull(source.f1)) {
    KeyValueOpt[K, V](source.f0, None)
  } else {
    KeyValueOpt[K, V](source.f0, Some(source.f1))
  }

  def fromKey[K, V](key: K): KeyValueOpt[K, V] = KeyValueOpt(key, None)

  def apply[K, V](key: K, value: V): KeyValueOpt[K, V] = KeyValueOpt(key, Some(value))

  implicit class AsKeyedValue[K, V](val event: (K, V)) {
    def wrapped: KeyValueOpt[K, V] = fromTuple(event)
  }

}