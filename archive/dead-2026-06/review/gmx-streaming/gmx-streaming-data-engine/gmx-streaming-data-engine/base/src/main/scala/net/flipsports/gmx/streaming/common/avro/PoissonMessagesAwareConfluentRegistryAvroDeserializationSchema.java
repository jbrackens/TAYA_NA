/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package net.flipsports.gmx.streaming.common.avro;

import io.confluent.kafka.schemaregistry.client.CachedSchemaRegistryClient;
import io.confluent.kafka.schemaregistry.client.SchemaRegistryClient;
import org.apache.avro.Schema;
import org.apache.avro.generic.GenericRecord;
import org.apache.avro.specific.SpecificRecord;
import org.apache.commons.lang3.ArrayUtils;
import org.apache.flink.formats.avro.AvroDeserializationSchema;
import org.apache.flink.formats.avro.RegistryAvroDeserializationSchema;
import org.apache.flink.formats.avro.SchemaCoder;
import org.apache.flink.formats.avro.registry.confluent.ConfluentRegistryAvroDeserializationSchema;
import org.apache.flink.formats.avro.registry.confluent.ConfluentSchemaRegistryCoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.annotation.Nullable;
import java.io.IOException;
import java.io.Serializable;

@Deprecated
public class PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<T> extends RegistryAvroDeserializationSchema<T>
    implements Serializable {

    private Logger log = LoggerFactory.getLogger(PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema.class);

    private PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema(Class<T> recordClazz, @Nullable Schema reader, SchemaCoder.SchemaCoderProvider schemaCoderProvider) {
        super(recordClazz, reader, schemaCoderProvider);
    }

    private static final int DEFAULT_IDENTITY_MAP_CAPACITY = 1000;

    private static final long serialVersionUID = -1671641202177852775L;

    public static PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<GenericRecord> forGeneric(Schema schema, String url, SchemaRegistryClient registryClient) {
        return forGeneric(schema, url, DEFAULT_IDENTITY_MAP_CAPACITY, registryClient);
    }

    /**
     * Creates {@link ConfluentRegistryAvroDeserializationSchema} that produces {@link GenericRecord}
     * using provided reader schema and looks up writer schema in Confluent Schema Registry.
     *
     * @param schema              schema of produced records
     * @param url                 url of schema registry to connect
     * @param identityMapCapacity maximum number of cached schema versions (default: 1000)
     * @return deserialized record in form of {@link GenericRecord}
     */
    public static PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<GenericRecord> forGeneric(Schema schema, String url,
                                                                                                           int identityMapCapacity, SchemaRegistryClient registryClient) {
        return new PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<>(
                GenericRecord.class,
                schema,
                new CachedSchemaCoderProvider(url, identityMapCapacity, registryClient));
    }

    /**
     * Creates {@link AvroDeserializationSchema} that produces classes that were generated from avro
     * schema and looks up writer schema in Confluent Schema Registry.
     *
     * @param tClass class of record to be produced
     * @param url    url of schema registry to connect
     * @return deserialized record
     */
    public static <T extends SpecificRecord> PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<T> forSpecific(Class<T> tClass,
                                                                                                                           String url, SchemaRegistryClient registryClient) {
        return forSpecific(tClass, url, DEFAULT_IDENTITY_MAP_CAPACITY, registryClient);
    }

    /**
     * Creates {@link AvroDeserializationSchema} that produces classes that were generated from avro
     * schema and looks up writer schema in Confluent Schema Registry.
     *
     * @param tClass              class of record to be produced
     * @param url                 url of schema registry to connect
     * @param identityMapCapacity maximum number of cached schema versions (default: 1000)
     * @return deserialized record
     */
    public static <T extends SpecificRecord> PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<T> forSpecific(Class<T> tClass,
                                                                                                                           String url, int identityMapCapacity, SchemaRegistryClient registryClient) {
        return new PoissonMessagesAwareConfluentRegistryAvroDeserializationSchema<>(
                tClass,
                null,
                new CachedSchemaCoderProvider(url, identityMapCapacity, registryClient)
        );
    }


    @Override
    public T deserialize(byte[] message) throws IOException {

        if (message == null || ArrayUtils.isEmpty(message)) {
            return null;
        }
        return super.deserialize(message);
    }


    private static class CachedSchemaCoderProvider implements SchemaCoder.SchemaCoderProvider {

        private static final long serialVersionUID = 4023134423033312666L;
        private final String url;
        private final int identityMapCapacity;
        private final SchemaRegistryClient registryClient;

        CachedSchemaCoderProvider(String url, int identityMapCapacity, SchemaRegistryClient registryClient) {
            this.url = url;
            this.identityMapCapacity = identityMapCapacity;
            this.registryClient = registryClient;
        }

        @Override
        public SchemaCoder get() {
            if (registryClient == null) {
               return new ConfluentSchemaRegistryCoder(new CachedSchemaRegistryClient(url, identityMapCapacity));
            }
            return new ConfluentSchemaRegistryCoder(registryClient);
        }
    }
}
