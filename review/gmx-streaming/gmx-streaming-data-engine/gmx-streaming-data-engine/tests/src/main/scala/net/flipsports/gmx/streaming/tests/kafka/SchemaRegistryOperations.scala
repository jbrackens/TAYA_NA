package net.flipsports.gmx.streaming.tests.kafka

import com.typesafe.scalalogging.LazyLogging
import io.confluent.kafka.serializers.subject.TopicNameStrategy
import sttp.client.{HttpURLConnectionBackend, basicRequest}
import sttp.model.StatusCode
import sttp.client._

trait SchemaRegistryOperations extends LazyLogging {

  implicit val schemaRegistryHttpClient = HttpURLConnectionBackend()

  private val topicNameStrategy: TopicNameStrategy = new TopicNameStrategy

  def withSchemaKeyOnSubject(registry: String, subject: String, recordSchemaJson: String) {
    sendToRegistry(registry, subject, recordSchemaJson, true)
  }

  def withSchemaValueOnSubject(registry: String, subject: String, recordSchemaJson: String) {
    sendToRegistry(registry, subject, recordSchemaJson)
  }

  private def sendToRegistry(registry: String, subject: String, recordSchemaJson: String, isKey: Boolean = false): Unit = {
    logger.info(s"Trying to register schema [${recordSchemaJson}] in schema registry in topic [$subject-key]")
    val json = buildSchemaRequestBody(recordSchemaJson)
    val registrySubjectName = topicNameStrategy.subjectName(subject, isKey, null)
    val request = basicRequest
      .body(json)
      .contentType("application/vnd.schemaregistry.v1+json")
      .post(uri"$registry/subjects/$registrySubjectName/versions")

    logger.info(s"Prepared request: ${request.toString}")


    val response = request.send()

    if (response.code != StatusCode.Ok) {
      logger.error(s"Publishing schema in registry failed! ${response.body}")
      throw new RuntimeException(s"Couldn't publish schema in registry. Failure: ${response.body}")
    }
    logger.info(s"Schema registry responded : [${response.body}]")
  }


  private def buildSchemaRequestBody(json: String): String = {
    val reformattedJson = json.replace("\"", "\\\"")
    "{ \"schema\" : \"%s\" }".format(reformattedJson)
  }

}
