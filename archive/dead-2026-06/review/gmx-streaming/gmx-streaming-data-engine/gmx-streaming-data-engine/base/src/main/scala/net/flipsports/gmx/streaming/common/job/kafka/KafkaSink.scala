package net.flipsports.gmx.streaming.common.job.kafka

import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import net.flipsports.gmx.streaming.common.avro.{AvroSerializationSchema, KeyedSerializationSchema, ValueSerializationSchema}
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.serialization.TypeInformationSerializationSchema
import org.apache.flink.api.common.typeinfo.TypeInformation
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer

@Deprecated
class KafkaSink[K, T](val topic: String, properties: KafkaProperties, schemaRegistry: Option[String] = None, registryClient: Option[SchemaRegistryClient]) extends Serializable {

  /**
   * Just Value Producer based on simple types. No schema registry in process.
   */
  def typedValue()(implicit ec: ExecutionConfig, valueTypeInformation: TypeInformation[T]): FlinkKafkaProducer[T] = {
    val valueSerializer = new TypeInformationSerializationSchema(valueTypeInformation, ec)
    val serializer = new ValueSerializationSchema[T](topic, valueSerializer)
    withTimestamp(new FlinkKafkaProducer(topic, serializer, properties.properties, FlinkKafkaProducer.Semantic.AT_LEAST_ONCE))
  }

  /**
   * Just Value Producer based on simple types or schema registry if provided.
   */
  def value()(implicit valueTypeInformation: TypeInformation[T]): FlinkKafkaProducer[T] = {
    val valueSerializer = serializerOf[T](false, topic, schemaRegistry)
    val serializer = new ValueSerializationSchema[T](topic, valueSerializer)
    withTimestamp(new FlinkKafkaProducer(topic, serializer, properties.properties, FlinkKafkaProducer.Semantic.AT_LEAST_ONCE))
  }

  /**
   * Key Value Producer based on simple types or schema registry if provided.
   */
  def typedKeyAndTypedValue()(implicit ec: ExecutionConfig, keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[T]): FlinkKafkaProducer[Tuple2[K, T]] = {
    val keySerializer = new TypeInformationSerializationSchema(keyTypeInformation, ec)
    val valueSerializer = new TypeInformationSerializationSchema(valueTypeInformation, ec)
    val serializer = new KeyedSerializationSchema[K, T](topic, keySerializer, valueSerializer)
    withTimestamp(new FlinkKafkaProducer[Tuple2[K, T]](topic, serializer, properties.properties, FlinkKafkaProducer.Semantic.AT_LEAST_ONCE))
  }

  /**
   * Key Value Producer based on simple key type and avro based value with or without schema registry.
   */
  def typedKeyAndValue()(implicit ec: ExecutionConfig, keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[T]): FlinkKafkaProducer[Tuple2[K, T]] = {
    val keySerializer = new TypeInformationSerializationSchema(keyTypeInformation, ec)
    val valueSerializer = serializerOf[T](false, topic, schemaRegistry)
    val serializer = new KeyedSerializationSchema[K, T](topic, keySerializer, valueSerializer)
    withTimestamp(new FlinkKafkaProducer[Tuple2[K, T]](topic, serializer, properties.properties, FlinkKafkaProducer.Semantic.AT_LEAST_ONCE))
  }

  /**
   * Key Value Producer based on avro types with or without schema registry.
   */
  def keyAndValue()(implicit keyTypeInformation: TypeInformation[K], valueTypeInformation: TypeInformation[T]): FlinkKafkaProducer[Tuple2[K, T]] = {
    val keySerializer = serializerOf[K](true, topic, schemaRegistry)(keyTypeInformation)
    val valueSerializer = serializerOf[T](false, topic, schemaRegistry)(valueTypeInformation)
    val serializer = new KeyedSerializationSchema[K, T](topic, keySerializer, valueSerializer)
    withTimestamp(new FlinkKafkaProducer[Tuple2[K, T]](topic, serializer, properties.properties, FlinkKafkaProducer.Semantic.AT_LEAST_ONCE))
  }

  private def withTimestamp[RECORD](producer: FlinkKafkaProducer[RECORD]): FlinkKafkaProducer[RECORD] = {
    producer.setWriteTimestampToKafka(true)
    producer
  }
  private def serializerOf[V](isKey: Boolean, topic: String, schemaRegistry: Option[String])(implicit valueTypeInformation: TypeInformation[V]) = new AvroSerializationSchema[V](isKey, valueTypeInformation, topic, schemaRegistry, registryClient)
}
@Deprecated
object KafkaSink {

  def apply[V](topic: String, properties: KafkaProperties, schemaRegistry: Option[String] = None, registryClient: Option[SchemaRegistryClient] = None) = new KafkaSink[Unit, V](topic, properties, schemaRegistry, registryClient)

  def apply[V](topic: String, properties: KafkaProperties) = new KafkaSink[Unit, V](topic, properties, None, None)

  def keyed[K, V](topic: String, properties: KafkaProperties) = new KafkaSink[K, V](topic, properties, None, None)

  def keyed[K, V](topic: String, properties: KafkaProperties, schemaRegistry: Option[String] = None, registryClient: Option[SchemaRegistryClient]) = new KafkaSink[K, V](topic, properties, schemaRegistry, registryClient)

  def keyed[K, V](topic: String, properties: KafkaProperties, schemaRegistry: String) = new KafkaSink[K, V](topic, properties, Some(schemaRegistry), None)

}