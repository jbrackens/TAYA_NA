package net.flipsports.gmx.streaming.sbtech.processors.v1

import com.typesafe.scalalogging.LazyLogging
import org.apache.avro.specific.{SpecificData, SpecificRecord}
import org.apache.flink.streaming.api.functions.ProcessFunction
import org.apache.flink.streaming.api.scala.OutputTag
import org.apache.flink.util.Collector
import org.apache.flink.api.java.tuple.Tuple2

import scala.util.{Failure, Success, Try}

class RowMapperProcessor[SOURCE_KEY, SOURCE_VALUE <: SpecificRecord, TARGET_KEY <: SpecificRecord, TARGET_VALUE <: SpecificRecord](clazz: Class[TARGET_VALUE], failures: OutputTag[String], keyMapper: (SOURCE_KEY, TARGET_VALUE) => TARGET_KEY) extends ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[TARGET_KEY, TARGET_VALUE]] with LazyLogging {
  override def processElement(value: Tuple2[SOURCE_KEY, SOURCE_VALUE], ctx: ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[TARGET_KEY, TARGET_VALUE]]#Context, out: Collector[Tuple2[TARGET_KEY, TARGET_VALUE]]): Unit =
    Try{
      if ( value.f1 != null)
        SpecificData.getForClass(clazz).deepCopy(value.f1.getSchema, value.f1).asInstanceOf[TARGET_VALUE]
      else
        null.asInstanceOf[TARGET_VALUE]
    } match {
      case Success(mapped) => out.collect(new Tuple2(keyMapper(value.f0, mapped), mapped))
      case Failure(exception) => {
        logger.error(s"Error during deserialization record. Record skipped. [${clazz.getSimpleName}] ", exception)
      }
    }
}

object RowMapperProcessor {

  def apply[SOURCE_KEY, SOURCE_VALUE <: SpecificRecord, TARGET_KEY <: SpecificRecord, TARGET_VALUE <: SpecificRecord](clazz: Class[TARGET_VALUE], failures: OutputTag[String], keyMapper: (SOURCE_KEY, TARGET_VALUE) => TARGET_KEY): ProcessFunction[Tuple2[SOURCE_KEY, SOURCE_VALUE], Tuple2[TARGET_KEY, TARGET_VALUE]] =
    new RowMapperProcessor[SOURCE_KEY, SOURCE_VALUE, TARGET_KEY, TARGET_VALUE](clazz, failures, keyMapper)

}
