package net.flipsports.gmx.streaming.common.job.streams.dto

case class Cache[E](events: Seq[E]) extends Serializable {

  def isEmpty(): Boolean = events.isEmpty
}
