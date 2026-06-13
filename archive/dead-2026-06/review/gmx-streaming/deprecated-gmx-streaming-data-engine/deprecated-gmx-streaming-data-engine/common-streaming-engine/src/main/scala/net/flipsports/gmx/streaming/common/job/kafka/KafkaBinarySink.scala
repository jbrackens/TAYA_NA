package net.flipsports.gmx.streaming.common.job.kafka


import net.flipsports.gmx.streaming.common.avro.AvroSerializationSchema
import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import org.apache.flink.api.common.ExecutionConfig
import org.apache.flink.api.common.serialization.TypeInformationSerializationSchema
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.api.java.typeutils.TypeExtractor
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaProducer

trait KafkaBinarySink extends KafkaProperties {

  def target: String

  def producer[T](clazz: Class[T]): FlinkKafkaProducer[T] = new FlinkKafkaProducer[T](target, new AvroSerializationSchema[T](clazz), properties)

  def keyedProducer[K, V](keyClazz: Class[K], valueClazz: Class[V], ec: ExecutionConfig): FlinkKafkaProducer[Tuple2[K, V]] = {
    val serializer = new KeyedAvroSerializationSchema(new TypeInformationSerializationSchema(TypeExtractor.createTypeInfo(keyClazz), ec), new AvroSerializationSchema[V](valueClazz))
    new FlinkKafkaProducer[Tuple2[K, V]](target, serializer, properties)
  }

}