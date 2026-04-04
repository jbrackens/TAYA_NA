package net.flipsports.gmx.streaming.common.kafka.serializer

import io.confluent.kafka.serializers.KafkaAvroSerializer
import net.flipsports.gmx.streaming.common.kafka.SchemaRegistryClientBuilder
import org.apache.kafka.common.serialization.Serializer

import scala.collection.JavaConverters._

object SchemaRegistryAvroSerializer extends Serializable {

  def serializer[T](schemaRegistryUrl: String, isKey: Boolean): Serializer[T] = {
    val serializer = new KafkaAvroSerializer(SchemaRegistryClientBuilder(schemaRegistryUrl))
    val properties = Map("schema.registry.url" -> schemaRegistryUrl)
    serializer.configure(properties.asJava, isKey)
    serializer.asInstanceOf[Serializer[T]]
  }

}
