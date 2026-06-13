package net.flipsports.gmx.streaming.common.kafka.deserializer

import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import org.apache.kafka.common.serialization.Deserializer

import java.util

class JsonRecordDeserializer[R](clazzOf: Class[R]) extends Deserializer[R] {

  private var mapper: ObjectMapper = _

  override def configure(configs: util.Map[String, _], isKey: Boolean): Unit = {
    //no-op
  }

  override def deserialize(topic: String, data: Array[Byte]): R = {
    if (mapper == null) mapper = new ObjectMapper
    val node = mapper.createObjectNode
    if (data != null) {
      node.set("value", mapper.readValue(data, classOf[JsonNode]))
    }
    mapper.treeToValue(node, clazzOf)
  }

  override def close(): Unit = {
    //no-op
  }

}

object JsonRecordDeserializer {

  def apply[R](clazzOf: Class[R]): Deserializer[R] = new JsonRecordDeserializer(clazzOf)

}