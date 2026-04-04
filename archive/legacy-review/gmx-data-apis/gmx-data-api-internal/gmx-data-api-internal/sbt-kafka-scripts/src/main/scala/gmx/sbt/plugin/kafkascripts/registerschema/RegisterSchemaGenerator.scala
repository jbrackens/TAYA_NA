package gmx.sbt.plugin.kafkascripts.registerschema

import gmx.sbt.plugin.kafkascripts.TopicSchema

class RegisterSchemaGenerator(loader: ClassLoader) {

  def generateScript(topicToAvro: Seq[TopicSchema]): String = {
    val contents = topicToAvro
      .map {
        case TopicSchema(topic, valueClass, Some(keyClass)) => generateTopicKeyValueScript(topic, valueClass, keyClass)
        case TopicSchema(topic, valueClass, None) => generateTopicValueScript(topic, valueClass)
      }

    val header =
      """#!/bin/bash
        |REGISTRY='localhost'
        |
        |""".stripMargin

    header + contents.mkString("\n")
  }

  private def generateTopicKeyValueScript(topic: String, valueClass: String, keyClass: String): String = {
    val valueSchema = getSchema(valueClass)
    val keySchema = getSchema(keyClass)

    s"""### Generated from: $valueClass
      |
      |TOPIC="$topic"
      |RECORD_KEY='$keySchema'
      |RECORD_VALUE='$valueSchema'
      |DATA_KEY='{"schema": "'$$RECORD_KEY'"}'
      |DATA_VALUE='{"schema": "'$$RECORD_VALUE'"}'
      |HOST_KEY="http://$$REGISTRY:8081/subjects/$$TOPIC-key/versions"
      |HOST_VALUE="http://$$REGISTRY:8081/subjects/$$TOPIC-value/versions"
      |echo "curl -X POST -H \\"Content-Type: application/vnd.schemaregistry.v1+json\\" --data  '$$DATA_KEY' $$HOST_KEY"
      |echo "curl -X POST -H \\"Content-Type: application/vnd.schemaregistry.v1+json\\" --data  '$$DATA_VALUE' $$HOST_VALUE"
      |""".stripMargin
  }

  private def generateTopicValueScript(topic: String, valueClass: String): String = {
    val valueSchema = getSchema(valueClass)

    s"""### Generated from: $valueClass
      |
      |TOPIC="$topic"
      |RECORD_VALUE='$valueSchema'
      |DATA_VALUE='{"schema": "'$$RECORD_VALUE'"}'
      |HOST_VALUE="http://$$REGISTRY:8081/subjects/$$TOPIC-value/versions"
      |echo "curl -X POST -H \\"Content-Type: application/vnd.schemaregistry.v1+json\\" --data  '$$DATA_VALUE' $$HOST_VALUE"
      |""".stripMargin
  }

  private def getSchema(className: String): String = {
    val clazz = Class.forName(className, true, loader)
    val fld = clazz.getDeclaredField("SCHEMA$")
    val schema = fld.get(null)
    schema.toString.replaceAll("\"", "\\\\\"")
  }
}
