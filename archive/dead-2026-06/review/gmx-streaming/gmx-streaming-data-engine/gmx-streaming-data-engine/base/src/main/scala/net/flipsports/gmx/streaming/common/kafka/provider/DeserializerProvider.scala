package net.flipsports.gmx.streaming.common.kafka.provider

import net.flipsports.gmx.streaming.common.kafka.deserializer.{JsonRecordDeserializer, SchemaRegistryAvroDeserializer, TypedAvroDeserializer}
import org.apache.avro.specific.SpecificRecord

import scala.reflect.runtime.universe._


/**
 * Due to execution on executors this functions should return function not objects
 */
object DeserializerProvider {

  object SpecificRecord {

    def keyAndValue[K <: SpecificRecord, V <: SpecificRecord](registry: String, keyClazz: Class[K], valueClazz: Class[V]): () => BinaryIO.Des[K, V] = () => BinaryIO.Des(
      Some(BinaryIO.BinaryContainer(keyClazz, SchemaRegistryAvroDeserializer.deserializer[K](registry, keyClazz, true))),
      BinaryIO.BinaryContainer(valueClazz, SchemaRegistryAvroDeserializer.deserializer[V](registry, valueClazz, false))
    )

    def value[V <: SpecificRecord](registry: String, clazz: Class[V]): () => BinaryIO.Des[Unit, V] = () => BinaryIO.Des(
      None,
      BinaryIO.BinaryContainer(clazz, SchemaRegistryAvroDeserializer.deserializer[V](registry, clazz, false))
    )

  }

  object MixedSpecificRecord {

    def keyValue[K: TypeTag, V <: SpecificRecord](registry: String, keyClass: Class[K], valueClazz: Class[V]): () => BinaryIO.Des[K, V] = () => BinaryIO.Des(
      Some(BinaryIO.BinaryContainer(keyClass, TypedAvroDeserializer.deserializer[K]())),
      BinaryIO.BinaryContainer(valueClazz, SchemaRegistryAvroDeserializer.deserializer[V](registry, valueClazz, false))
    )

  }

  object JsonRecord {

    def value[V](clazz: Class[V]): () => BinaryIO.Des[Unit, V] = () => BinaryIO.Des(
      None,
      BinaryIO.BinaryContainer(clazz, JsonRecordDeserializer[V](clazz))
    )

    def keyValue[K, V](keyClazz: Class[K], valueClazz: Class[V]): () => BinaryIO.Des[K, V] = () => BinaryIO.Des(
      Some(BinaryIO.BinaryContainer(keyClazz, JsonRecordDeserializer[K](keyClazz))),
      BinaryIO.BinaryContainer(valueClazz, JsonRecordDeserializer[V](valueClazz))
    )
  }
}
