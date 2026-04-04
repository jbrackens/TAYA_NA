package net.flipsports.gmx.game.argyll.racingroulette.webgateway.services.data.stream.serializer

import org.apache.avro.specific.SpecificRecord

trait AvroSerializer {

  def serializer[T <: SpecificRecord](item: T, clazz: Class[T]): Array[Byte]

  def deserializer[T <: SpecificRecord](item: Array[Byte], clazz: Class[T]): T
}