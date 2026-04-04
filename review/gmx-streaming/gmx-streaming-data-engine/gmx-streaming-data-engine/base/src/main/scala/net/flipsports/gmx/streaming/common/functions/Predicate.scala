package net.flipsports.gmx.streaming.common.functions

import org.apache.flink.api.common.functions

trait Predicate [T] extends functions.Function {

  def test(value: T): Boolean

  def and(other: Predicate[_ >: T]): Predicate[T] = (value: T) => test(value) && other.test(value)

  def negate(): Predicate[T] = (t: T) => !test(t)

  def or(other: Predicate[_ >: T]): Predicate[T] = (value: T) => test(value) || other.test(value)

}
