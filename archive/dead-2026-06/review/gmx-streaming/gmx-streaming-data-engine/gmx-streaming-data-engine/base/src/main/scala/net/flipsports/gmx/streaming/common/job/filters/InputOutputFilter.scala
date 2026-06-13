package net.flipsports.gmx.streaming.common.job.filters

import org.apache.flink.api.common.functions.FilterFunction

trait InputOutputFilter[IN, OUT] extends Serializable {
  def input: FilterFunction[IN]

  def output: FilterFunction[OUT]
}

case class TupledFilter[IN, OUT](input: FilterFunction[IN], output: FilterFunction[OUT]) extends InputOutputFilter[IN, OUT]


object InputOutputFilter {

  class TrueFilter[T] extends FilterFunction[T] {
    override def filter(value: T): Boolean = true
  }

  case class TupledTrueFilter[IN, OUT]() extends InputOutputFilter[IN, OUT] {

    override def input: FilterFunction[IN] = new TrueFilter[IN]

    override def output: FilterFunction[OUT] = new TrueFilter[OUT]
  }

  def alwaysPositive[IN, OUT] = new TupledTrueFilter[IN, OUT]
}