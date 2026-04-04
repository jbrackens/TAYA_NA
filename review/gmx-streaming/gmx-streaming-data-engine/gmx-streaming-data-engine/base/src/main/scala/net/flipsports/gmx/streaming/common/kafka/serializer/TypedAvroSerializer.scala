package net.flipsports.gmx.streaming.common.kafka.serializer

import org.apache.kafka.common.serialization.{IntegerSerializer, LongSerializer, Serializer, StringSerializer}

import scala.reflect.runtime.universe._

object TypedAvroSerializer {

  def serializer[T: TypeTag](): Serializer[T] = (typeOf[T] match {
      case t if t  =:= typeOf[java.lang.Long] => new LongSerializer()
      case t if t  =:= typeOf[java.lang.Integer] => new IntegerSerializer()
      case t if t  =:= typeOf[java.lang.String] => new StringSerializer()
      case t if t  =:= typeOf[Long] => new LongSerializer()
      case t if t  =:= typeOf[Integer] => new IntegerSerializer()
      case _ => new StringSerializer()
    }).asInstanceOf[Serializer[T]]

}
