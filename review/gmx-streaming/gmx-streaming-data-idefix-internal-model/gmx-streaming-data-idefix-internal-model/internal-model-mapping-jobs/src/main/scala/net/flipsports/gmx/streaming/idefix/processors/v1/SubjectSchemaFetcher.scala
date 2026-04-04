package net.flipsports.gmx.streaming.idefix.processors.v1

import net.flipsports.gmx.streaming.common.kafka.SchemaRegistryClientBuilder
import org.apache.avro.Schema

import scala.collection.JavaConverters._

class SubjectSchemaFetcher(registryUrl: String, topicName: String) {

  val schemaRegistryClientBuilder = SchemaRegistryClientBuilder(registryUrl)

  def get(): Schema = {
    val versions = schemaRegistryClientBuilder.getAllVersions(topicName).asScala
    val latestSchema = versions.sorted.last
    schemaRegistryClientBuilder.getByID(latestSchema)
  }
}
