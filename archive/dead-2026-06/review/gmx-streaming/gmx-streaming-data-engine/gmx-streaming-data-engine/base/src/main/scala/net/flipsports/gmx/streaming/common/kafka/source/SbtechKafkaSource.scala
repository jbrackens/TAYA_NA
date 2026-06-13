package net.flipsports.gmx.streaming.common.kafka.source

import net.flipsports.gmx.streaming.common.configs.KafkaProperties
import net.flipsports.gmx.streaming.common.kafka.consumerschema.KeyValueConsumerSchema
import net.flipsports.gmx.streaming.common.kafka.provider.DeserializerProvider
import org.apache.avro.specific.SpecificRecord
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.connectors.kafka.FlinkKafkaConsumer

import scala.reflect.runtime.universe._

class SbtechKafkaSource(topic: String,
                        properties: KafkaProperties,
                        schemaRegistry: String)
    extends KafkaSource(topic, properties, Some(schemaRegistry)) {

  def typedKeyAndSpecificValue[K : TypeTag, V <: SpecificRecord](keyClazz: Class[K],  valueClazz: Class[V]): FlinkKafkaConsumer[Tuple2[K, V]] =
    withStartFromGroupOffset {
      new FlinkKafkaConsumer[Tuple2[K, V]](
        topic,
        KeyValueConsumerSchema[K, V](DeserializerProvider.MixedSpecificRecord.keyValue(schemaRegistry, keyClazz, valueClazz)),
        properties.properties
      )
    }
}

object  SbtechKafkaSource {

  def apply(topic: String, kafkaProperties: KafkaProperties, registry: String) = new SbtechKafkaSource(topic, kafkaProperties, registry)
}
