package net.flipsports.gmx.streaming.idefix.processors.v1

import com.typesafe.scalalogging.LazyLogging
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.streaming.api.scala.OutputTag
import org.apache.flink.util.Collector

class SchemaValidatorProcessor[SOURCE_KEY, SOURCE_VALUE <: SpecificRecord](failures: OutputTag[String]) extends ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[SOURCE_KEY, SOURCE_VALUE]] with LazyLogging {

  override def processElement(value: Tuple2[SOURCE_KEY, SOURCE_VALUE], ctx: ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[SOURCE_KEY, SOURCE_VALUE]]#Context, out: Collector[Tuple2[SOURCE_KEY, SOURCE_VALUE]]): Unit = {
    out.collect(value) // forward element

    // TODO: add additional schema validation and some other actions


  }
}

object SchemaValidatorProcessor {

  def apply[SOURCE_KEY, SOURCE_VALUE <: SpecificRecord](failures: OutputTag[String]): ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[SOURCE_KEY, SOURCE_VALUE]] =
    new SchemaValidatorProcessor[SOURCE_KEY, SOURCE_VALUE](failures)

}
