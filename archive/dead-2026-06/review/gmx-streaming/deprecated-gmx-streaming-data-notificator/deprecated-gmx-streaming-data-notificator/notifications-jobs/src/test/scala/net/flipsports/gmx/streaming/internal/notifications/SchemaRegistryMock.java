package net.flipsports.gmx.streaming.internal.notifications;

import SBTech.Microservices.DataStreaming.DTO.CustomerDetails.v1.CustomerDetail;
import io.confluent.kafka.schemaregistry.client.MockSchemaRegistryClient;
import io.confluent.kafka.schemaregistry.client.rest.exceptions.RestClientException;
import net.flipsports.gmx.dataapi.internal.notificator.notifications.NotificationEvent;
import org.apache.avro.Schema;

import java.io.IOException;
import java.io.Serializable;

public class SchemaRegistryMock extends MockSchemaRegistryClient implements Serializable {

    public SchemaRegistryMock() {
        super();
        registerSchemas();
    }

    @Override
    public synchronized Schema getBySubjectAndId(String subject, int id) throws IOException, RestClientException {
        registerSchemas();
        return super.getBySubjectAndId(subject, id);
    }


    private void registerSchemas() {
        try {
            this.register("ds_customerdetails_155-value", CustomerDetail.SCHEMA$);
            this.register("ds_customerdetails_154-value", CustomerDetail.SCHEMA$);
            this.register("gmx-messaging.notification-events-value", NotificationEvent.SCHEMA$);
            this.register("gmx-messaging.notification-events", NotificationEvent.SCHEMA$);
        } catch (Exception e) {
            e.printStackTrace();
        }

    }





}



