package net.flipsports.gmx.streaming.common.kafka

import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient

object SchemaRegistryClientBuilder {

  def apply(schemaRegistryUrl: String) = new CachedSchemaRegistryClient(schemaRegistryUrl, 3)
}
