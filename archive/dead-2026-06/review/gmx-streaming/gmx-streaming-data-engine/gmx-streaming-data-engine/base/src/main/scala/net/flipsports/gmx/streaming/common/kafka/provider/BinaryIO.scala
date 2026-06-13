package net.flipsports.gmx.streaming.common.kafka.provider

import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.kafka.common.serialization.{Deserializer, Serializer}

object BinaryIO {

  case class BinaryContainer[T, IO](clazz: Class[T], io: IO) {

    def typeInformation: TypeInformation[T] = TypeInformation.of(clazz)

  }

  case class Ser[K, V](key: Option[BinaryContainer[K, Serializer[K]]], value: BinaryContainer[V, Serializer[V]])

  case class Des[K, V](key: Option[BinaryContainer[K, Deserializer[K]]], value: BinaryContainer[V, Deserializer[V]])

}