package net.flipsports.gmx.streaming.common.avro

import com.typesafe.scalalogging.LazyLogging
import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.serialization.{DeserializationSchema, SimpleStringSchema, TypeInformationSerializationSchema}
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.TupleTypeInfo
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.KafkaDeserializationSchema
import org.apache.kafka.clients.consumer.ConsumerRecord

@Deprecated
class ValuedAvroDeserializationSchema[KEY, VALUE](val topic: String, keyDeserializer: DeserializationSchema[KEY], valueDeserializer: DeserializationSchema[VALUE])
                                                 (implicit keyTypeInformation: TypeInformation[KEY], valueTypeInformation: TypeInformation[VALUE])
  extends KafkaDeserializationSchema[Tuple2[KEY, VALUE]]
    with LazyLogging
    with Serializable {

  override def isEndOfStream(nextElement: Tuple2[KEY, VALUE]): Boolean = false

  override def deserialize(record: ConsumerRecord[Array[Byte], Array[Byte]]): Tuple2[KEY, VALUE] = {
    val key = extractKey(record.key())
    val value = extractValue(record.value())

    val result = new Tuple2[KEY, VALUE]()

    if (!key.isEmpty) {
      result.setField(key.get, 0)
    }
    if (!value.isEmpty) {
      result.setField(value.get, 1)
    }
    result
  }


  private def extractKey(record: Array[Byte]): Option[KEY] = if (record == null || record.isEmpty) {
    None
  } else {
    Some(keyDeserializer.deserialize(record))
  }

  private def extractValue(record: Array[Byte]): Option[VALUE] = if (record == null || record.isEmpty) {
    None
  } else {
    Some(valueDeserializer.deserialize(record))
  }

  override def getProducedType: TypeInformation[Tuple2[KEY, VALUE]] = new TupleTypeInfo[Tuple2[KEY, VALUE]](TypeInformation.of(keyTypeInformation.getTypeClass), TypeInformation.of(valueTypeInformation.getTypeClass));
}

@Deprecated
object ValuedAvroDeserializationSchema {

  /**
   * Key is simple record without schema
   * Value is specific record without schema registry
   */

  def forSpecific[KEY, VALUE <: SpecificRecord](topic: String)(implicit keyTypeInformation: TypeInformation[KEY], valueTypeInformation: TypeInformation[VALUE], ec: ExecutionConfig): KafkaDeserializationSchema[Tuple2[KEY, VALUE]] =
    new ValuedAvroDeserializationSchema[KEY, VALUE](topic, simpleTypeDeserializer, complexDeserializer[VALUE])

  /**
   * Key and value are both present on schema registry
   */
  def schemaRegistry[KEY <: SpecificRecord, VALUE <: SpecificRecord](topic: String, url: String, registryClient: Option[SchemaRegistryClient])(implicit keyTypeInformation: TypeInformation[KEY], valueTypeInformation: TypeInformation[VALUE]): KafkaDeserializationSchema[Tuple2[KEY, VALUE]] =
    new ValuedAvroDeserializationSchema[KEY, VALUE](topic, complexSchemaRegistryDeserializer[KEY](url, registryClient), complexSchemaRegistryDeserializer[VALUE](url, registryClient))


  /**
   * Key is simple type without schema registry defined
   * Value is present in schema registry
   */
  def mixedSchemaRegistry[KEY, VALUE <: SpecificRecord](topic: String, url: String, registryClient: Option[SchemaRegistryClient])(implicit keyTypeInformation: TypeInformation[KEY], valueTypeInformation: TypeInformation[VALUE], ec: ExecutionConfig): KafkaDeserializationSchema[Tuple2[KEY, VALUE]] = {
    if (keyTypeInformation.getTypeClass == classOf[String]) {
      new ValuedAvroDeserializationSchema[KEY, VALUE](topic, new SimpleStringSchema().asInstanceOf[DeserializationSchema[KEY]], complexSchemaRegistryDeserializer[VALUE](url, registryClient))
    } else {
      new ValuedAvroDeserializationSchema[KEY, VALUE](topic, simpleTypeDeserializer, complexSchemaRegistryDeserializer[VALUE](url, registryClient))
    }

  }

  private def simpleTypeDeserializer[KEY](implicit keyTypeInformation: TypeInformation[KEY], ec: ExecutionConfig) = new TypeInformationSerializationSchema(keyTypeInformation, ec)

  private def complexSchemaRegistryDeserializer[VALUE <: SpecificRecord](url: String, schemaRegistryClient: Option[SchemaRegistryClient])(implicit typeInformation: TypeInformation[VALUE]) = PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema.forSpecific[VALUE](typeInformation.getTypeClass, url, schemaRegistryClient.getOrElse(null))

  private def complexDeserializer[VALUE <: SpecificRecord]()(implicit typeInformation: TypeInformation[VALUE]) = AvroDeserializationSchema.forSpecific[VALUE](typeInformation.getTypeClass)
}