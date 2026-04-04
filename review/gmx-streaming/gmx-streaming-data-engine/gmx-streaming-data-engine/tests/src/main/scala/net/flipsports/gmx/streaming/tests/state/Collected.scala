package net.flipsports.gmx.streaming.tests.state

import org.apache.flink.util.Collector

import java.util
import java.util.Collections

object Collected {

  class CollectedDef[T] extends Collector[T] {

    val result = Collections.synchronizedList(new util.ArrayList[T])

    override def collect(record: T): Unit = result.add(record)

    override def close(): Unit = result.clear()
  }
}