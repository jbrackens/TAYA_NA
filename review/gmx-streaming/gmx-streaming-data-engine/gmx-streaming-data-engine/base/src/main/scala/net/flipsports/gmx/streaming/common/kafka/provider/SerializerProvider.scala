package net.flipsports.gmx.streaming.common.kafka.provider

import net.flipsports.gmx.streaming.common.kafka.serializer.{AvroSerializer, SchemaRegistryAvroSerializer, TypedAvroSerializer}
import org.apache.avro.specific.SpecificRecord

import scala.reflect.runtime.universe._

/**
 * Due to execution on executors this functions should return function not objects
 */
object SerializerProvider {


  object SpecificRecords {

    def keyAndValue[K <: SpecificRecord, V <: SpecificRecord](registry: String, keyClazz: Class[K], valueClazz: Class[V]): () => BinaryIO.Ser[K, V] = () => BinaryIO.Ser(
      Some(BinaryIO.BinaryContainer(keyClazz, SchemaRegistryAvroSerializer.serializer(registry, true))),
      BinaryIO.BinaryContainer(valueClazz, SchemaRegistryAvroSerializer.serializer(registry, false))
    )

    def keyAndValue[K <: SpecificRecord, V <: SpecificRecord](keyClazz: Class[K], valueClazz: Class[V]): () => BinaryIO.Ser[K, V] = () => BinaryIO.Ser(
      Some(BinaryIO.BinaryContainer(keyClazz, AvroSerializer.serializer(keyClazz))),
      BinaryIO.BinaryContainer(valueClazz, AvroSerializer.serializer( valueClazz))
    )

  }

  object MixedSpecificRecords {

    def typedKeyAndSpecificValue[K : TypeTag, V <: SpecificRecord](registry: String, keyClass: Class[K],  valueClass: Class[V]): () => BinaryIO.Ser[K, V] = () => BinaryIO.Ser(
      Some(BinaryIO.BinaryContainer(keyClass, TypedAvroSerializer.serializer())),
      BinaryIO.BinaryContainer(valueClass, SchemaRegistryAvroSerializer.serializer(registry, false))
    )

    def typedKeyAndSpecificValue[K : TypeTag, V <: SpecificRecord](keyClass: Class[K],  valueClass: Class[V]): () => BinaryIO.Ser[K, V] = () => BinaryIO.Ser(
      Some(BinaryIO.BinaryContainer(keyClass, TypedAvroSerializer.serializer())),
      BinaryIO.BinaryContainer(valueClass, AvroSerializer.serializer(valueClass))
    )

  }

}

