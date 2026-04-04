import io
import logging
import os

import avro.schema
from avro.io import DatumWriter, AvroTypeException
from aws_rest_default.service import Singleton
from django.conf import settings
from django.utils.timezone import now
from kafka import KafkaProducer
from kafka.errors import KafkaTimeoutError

logger = logging.getLogger(__name__)


class KafkaService(metaclass=Singleton):
    """
       This class is used to open communication with Kafka streaming service.
    """
    def __init__(self, bootstrap_servers=None,
                 request_timeout_ms=None,
                 api_version_auto_timeout_ms=None,
                 api_version=None,
                 topic: str = None):

        self.bootstrap_servers = bootstrap_servers
        self.request_timeout_ms = request_timeout_ms
        self.api_version_auto_timeout_ms = api_version_auto_timeout_ms
        self.api_version = api_version
        self.topic = topic
        self.producer = KafkaProducer(bootstrap_servers=self.bootstrap_servers,
                                      request_timeout_ms=self.request_timeout_ms,
                                      api_version_auto_timeout_ms=self.api_version_auto_timeout_ms,
                                      api_version=self.api_version
                                      )
        self.schema_path = os.path.join(settings.BASE_DIR, 'avro/wallet/')
        self.schema = avro.schema.Parse(avro.LoadResource(os.path.join(self.schema_path, 'wallet.send_event.avsc')))

    @classmethod
    def send_event(cls, user_sub, originator, event_data, event_type='WALLET_NEW_LINE', event_date=None, api_request=None):
        return cls()._send_event(user_sub, originator, event_data, event_type=event_type, event_date=event_date, api_request=api_request)

    def _send_event(self, user_sub, originator, event_data, event_type='WALLET_NEW_LINE', event_date=None, api_request=None):

        if event_date is None:
            event_date = now()
        if api_request is None:
            api_request = 'PC_SERVICE_SEND_EVENT_{}'.format(event_type)

        payload = {
            'user_sub': user_sub,
            'originator': originator,
            'event_data': event_data,
            'event_type': event_type,
            'event_date': event_date.isoformat(),
            'api_message_request_id': api_request
        }
        try:
            key = user_sub.encode()
            writer = DatumWriter(self.schema)
            bytes_writer = io.BytesIO()
            encoder = avro.io.BinaryEncoder(bytes_writer)
            writer.write(payload, encoder)
            raw_bytes = bytes_writer.getvalue()

            self.producer.send(self.topic, value=raw_bytes, key=key) \
                .add_callback(self.on_send_success) \
                .add_errback(self.on_send_error)

            self.producer.flush()
        except AvroTypeException as e:
            msg = 'Error during AVRO Schema validate. Wrong message. {}'.format(e)
            logger.exception(msg)
            raise ValueError(msg)
        except KafkaTimeoutError as e:
            msg = 'Error during Kafka message produce. {}'.format(e)
            logger.exception(msg)
            raise ValueError(msg)

    @staticmethod
    def on_send_success(record_metadata):
        logger.info('Sent message to Kafka')
        logger.info('Kafka Topic:{}'.format(record_metadata.topic))
        logger.info('Kafka Partition:{}'.format(record_metadata.partition))
        logger.info('Kafka Offset:{}'.format(record_metadata.offset))

    @staticmethod
    def on_send_error(exception):
        msg = 'Error during Kafka message produce. {}'.format(exception)
        logger.exception(msg)
        raise ValueError(msg)
