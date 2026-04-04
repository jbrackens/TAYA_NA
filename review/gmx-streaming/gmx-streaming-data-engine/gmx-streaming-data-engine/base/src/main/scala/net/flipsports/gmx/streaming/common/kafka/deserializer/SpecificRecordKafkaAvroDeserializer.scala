package net.flipsports.gmx.streaming.common.kafka.deserializer

import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient
import io.confluent.kafka.serializers.KafkaAvroDeserializer
import net.flipsports.gmx.streaming.common.avro.AvroUtilMapper
import org.apache.avro.Schema
import org.apache.avro.specific.SpecificRecord

class SpecificRecordKafkaAvroDeserializer[V <: SpecificRecord](clazz: Class[V], client: SchemaRegistryClient) extends KafkaAvroDeserializer(client) with Serializable {

  override def deserialize(s: String, bytes: Array[Byte]): Object = {
    val result = super.deserialize(s, bytes)
    genericRecordToSpecificRecord apply result
  }

  override def deserialize(s: String, bytes: Array[Byte], readerSchema: Schema): Object = {
    val result = super.deserialize(s, bytes, readerSchema)
    genericRecordToSpecificRecord apply result
  }

  private def genericRecordToSpecificRecord = (record: Object) => AvroUtilMapper.specificData[V](clazz, record)

}
