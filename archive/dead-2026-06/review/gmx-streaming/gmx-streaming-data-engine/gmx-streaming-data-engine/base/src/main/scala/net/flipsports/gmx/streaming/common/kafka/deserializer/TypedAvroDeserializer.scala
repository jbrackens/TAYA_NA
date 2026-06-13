package net.flipsports.gmx.streaming.common.kafka.deserializer

import org.apache.kafka.common.serialization.{Deserializer, DoubleDeserializer, IntegerDeserializer, LongDeserializer, StringDeserializer}

import scala.reflect.runtime.universe._

object TypedAvroDeserializer {

  def deserializer[T: TypeTag](): Deserializer[T] = (typeOf[T] match {
      case t if t  =:= typeOf[java.lang.Long] => new LongDeserializer()
      case t if t  =:= typeOf[java.lang.Integer] => new IntegerDeserializer()
      case t if t  =:= typeOf[java.lang.Double] => new DoubleDeserializer()
      case _ => new StringDeserializer()
    }).asInstanceOf[Deserializer[T]]

}
