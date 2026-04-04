package net.flipsports.gmx.streaming.common.job.streams.dto

case class Value[V](value: V) {

  def isValueNull(): Boolean = value == null

}

object Value {

  implicit class AsValue[V](val event: V) {
    def wrapped: Value[V] = Value[V](event)
  }

}
