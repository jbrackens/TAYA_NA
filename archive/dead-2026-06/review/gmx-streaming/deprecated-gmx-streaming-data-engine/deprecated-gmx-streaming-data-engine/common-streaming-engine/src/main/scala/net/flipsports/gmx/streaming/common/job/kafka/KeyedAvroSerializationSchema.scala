package net.flipsports.gmx.streaming.common.job.kafka

import org.apache.flink.api.common.serialization.SerializationSchema
import org.apache.flink.api.java.tuple.Tuple2
import org.apache.flink.streaming.util.serialization.KeyedSerializationSchema

class KeyedAvroSerializationSchema[K, V](val keySerializer: SerializationSchema[K], valueSerializer: SerializationSchema[V]) extends KeyedSerializationSchema[Tuple2[K, V]] {

  override def serializeKey(element: Tuple2[K, V]): Array[Byte] = keySerializer.serialize(element.f0)

  override def serializeValue(element: Tuple2[K, V]): Array[Byte] = valueSerializer.serialize(element.f1)

  override def getTargetTopic(element: Tuple2[K, V]): String = null

}
