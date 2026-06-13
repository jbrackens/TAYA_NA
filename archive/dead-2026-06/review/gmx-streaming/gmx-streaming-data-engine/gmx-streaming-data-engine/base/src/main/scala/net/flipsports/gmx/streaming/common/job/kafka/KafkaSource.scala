package net.flipsports.gmx.streaming.common.job.kafka

import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import net.flipsports.gmx.streaming.common.avro.{PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema, ValuedAvroDeserializationSchema}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.apache.avro.Schema
import org.apache.avro.generic.GenericRecord
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.formats.avro.AvroDeserializationSchema
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer

/**
 * If there is no offset - kafka will start's consuming from beginning
 */
@Deprecated
class KafkaSource(val topic: String, properties: KafkaProperties, schemaRegistry: Option[String], schemaRegistryClient: Option[SchemaRegistryClient]) extends Serializable  {

  /**
   * Method takes schema and creates generic records consumer with or without schema registry. If you provide schemaRegistry class property it will fetch and validate schema from registry.
   * @param schema definition - normally defined in avro generated POJO
   * @return consumer without strong type GenericRecord
   * @see org.apache.avro.generic.GenericRecord
   */
  def genericRecordValue(schema: Schema): FlinkKafkaConsumer[GenericRecord] = withStartFromGroupOffset {
    schemaRegistry match {
      case Some(url) => new FlinkKafkaConsumer[GenericRecord](topic, PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema.forGeneric(schema, url, schemaRegistryClient.getOrElse(null)), properties.properties)
      case _ => new FlinkKafkaConsumer[GenericRecord](topic, AvroDeserializationSchema.forGeneric(schema), properties.properties)
    }
  }

  /**
   * Method takes no schema for fetching. Resolving is based on typeInformation implicits. If you provide schemaRegistry class property it will fetch and validate schema from registry. If no schema registry
   * consuming will be based on SpecificRecord
   * @return SpecificRecord
   */
  def specificRecordValue[V <: SpecificRecord]()(implicit typeInformation: TypeInformation[V]): FlinkKafkaConsumer[V] = withStartFromGroupOffset {
    obtainSpecificConsumerWithOrWithoutSchema()
  }
  /**
   * Method allows to create Any type consumer (String, Avro). Behavior for value is same as specificRecordValue method. Consuming might be with or without schema registry.
   */
  def typedKeySpecificRecordValue[K, V <: SpecificRecord]()(implicit keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[V], ec: ExecutionConfig): FlinkKafkaConsumer[Tuple2[K, V]] = withStartFromGroupOffset {
    obtainTypedKeyAndSpecificValueConsumerWithOrWithoutSchema()
  }

  /**
   * Key, Value must be Specific Records. Type is based on implicit TypeInformation. Consuming might be with or without schema registry.
   */
  def specificRecordKeyAndValue[K <: SpecificRecord, V <: SpecificRecord]()(implicit keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[V], ec: ExecutionConfig): FlinkKafkaConsumer[Tuple2[K, V]] = withStartFromGroupOffset {
    obtainSpecificKeyAndValueConsumerWithOrWithoutSchema()
  }

  private def obtainSpecificConsumerWithOrWithoutSchema[S <: SpecificRecord]()(implicit typeInformation: TypeInformation[S]) =  schemaRegistry match {
    case Some(url) => new FlinkKafkaConsumer[S](topic, PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema.forSpecific[S](typeInformation.getTypeClass, url, schemaRegistryClient.getOrElse(null)), properties.properties)
    case _ => new FlinkKafkaConsumer[S](topic, AvroDeserializationSchema.forSpecific[S](typeInformation.getTypeClass), properties.properties)
  }

  private def obtainTypedKeyAndSpecificValueConsumerWithOrWithoutSchema[K, V <: SpecificRecord]()(implicit keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[V], ec: ExecutionConfig) = schemaRegistry match {
    case Some(url) => new FlinkKafkaConsumer[Tuple2[K, V]] (topic, ValuedAvroDeserializationSchema.mixedSchemaRegistry[K, V](topic, url, schemaRegistryClient), properties.properties)
    case _ => new FlinkKafkaConsumer[Tuple2[K, V]](topic, ValuedAvroDeserializationSchema.forSpecific[K, V](topic), properties.properties)
  }

  private def obtainSpecificKeyAndValueConsumerWithOrWithoutSchema[K <: SpecificRecord, V <: SpecificRecord]()(implicit keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[V], ec: ExecutionConfig) = schemaRegistry match {
    case Some(url) => new FlinkKafkaConsumer[Tuple2[K, V]] (topic, ValuedAvroDeserializationSchema.schemaRegistry[K, V](topic, url, schemaRegistryClient), properties.properties)
    case _ => new FlinkKafkaConsumer[Tuple2[K, V]](topic, ValuedAvroDeserializationSchema.forSpecific[K, V](topic), properties.properties)
  }

  private def withStartFromGroupOffset[Record](f:  => FlinkKafkaConsumer[Record]) = {
    val consumer = f
    consumer.setStartFromGroupOffsets()
    consumer
  }

}
@Deprecated
object KafkaSource {

  def apply(topic: String, properties: KafkaProperties) = new KafkaSource(topic, properties, None, None)

  def apply(topic: String, properties: KafkaProperties, schemaRegistry: String, schemaRegistryClient: SchemaRegistryClient) = new KafkaSource(topic, properties, Some(schemaRegistry), Some(schemaRegistryClient))

  def apply(topic: String, properties: KafkaProperties, schemaRegistry: Option[String], schemaRegistryClient: Option[SchemaRegistryClient]) = new KafkaSource(topic, properties, schemaRegistry, schemaRegistryClient)

  def apply(topic: String, properties: KafkaProperties, schemaRegistry: String) = new KafkaSource(topic, properties, Some(schemaRegistry), None)
}