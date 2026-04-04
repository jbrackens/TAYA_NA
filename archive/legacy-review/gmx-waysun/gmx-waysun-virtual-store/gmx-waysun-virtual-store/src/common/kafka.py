import logging
from enum import Enum
from uuid import UUID, uuid4

import ujson as json
from django.conf import settings
from kafka import KafkaProducer
from kafka.errors import KafkaError
from kafka.producer.future import RecordMetadata
from kafka.producer.record_accumulator import AtomicInteger

logger = logging.getLogger(f"{__name__}.KafkaService")


class ServiceException(Exception):
    pass


class KafkaServiceException(ServiceException):
    pass


class KafkaServiceBufferException(KafkaServiceException):
    pass


_KafkaProducerCounter = AtomicInteger()


def _key_serializer(key) -> bytes:
    if isinstance(key, UUID):
        key = str(key)
    elif isinstance(key, int):
        key = str(int)
    elif isinstance(key, str):
        key = key
    else:
        raise ValueError(f"key type({type(key)}) is not supported")

    return key.encode()


def _value_serializer(data) -> bytes:
    def _decode_types(obj):
        if isinstance(obj, dict):
            for key in list(obj.keys()):
                obj[key] = _decode_types(obj[key])
        elif isinstance(obj, (list, tuple)):
            obj = list(obj)
            result = list()
            while i := (obj.pop(0) if obj else None):
                result.append(_decode_types(i))
            return result
        elif isinstance(obj, UUID):
            obj = str(obj)
        return obj

    if isinstance(data, bytes):
        return data
    elif isinstance(data, str):
        return data.encode()
    else:
        result_obj: str = json.dumps(_decode_types(data), sort_keys=True)
    return result_obj.encode()


class KafkaService:
    _producer: KafkaProducer
    KAFKA_POLL_TIMEOUT = settings.KAFKA_POLL_TIMEOUT
    KAFKA_FLUSH_TIMEOUT = settings.KAFKA_FLUSH_TIMEOUT

    class EventTypesEnum(str, Enum):
        PAYMENT_NOTIFICATION = "PAYMENT_NOTIFICATION"
        BACKPACK_CREATE = "BACKPACK_CREATE"
        BACKPACK_ACTIVATE = "BACKPACK_ACTIVATE"
        SUBSCRIPTION_ACTIVATE = "SUBSCRIPTION_ACTIVATE"
        SUBSCRIPTION_DEACTIVATE = "SUBSCRIPTION_DEACTIVATE"

    class EventSubTypesEnum(str, Enum):
        CHINA_MOBILE = "CHINA_MOBILE"
        ANTSTREAM = "ANTSTREAM"
        NONE = "NONE"

    def __init__(self):
        if settings.KAFKA_SERVICE_MOCK:
            logger.warning("Kafka service will be mocked!")
            return
        client_id = f"{settings.KAFKA_CLIENT_ID}_{_KafkaProducerCounter.increment()}"
        logger.info(f"Staring KafkaProducer({client_id})")
        self._producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            client_id=client_id,
            key_serializer=_key_serializer,
            value_serializer=_value_serializer,
            acks="all",
            retries=settings.KAFKA_MESSAGE_MAX_RETRIES,
            batch_size=0,
        )

    def __call__(self):
        return self

    def get_instance(self):
        return self

    def _send(self, topic, key, obj, correlation_id=None):
        """
        :param topic:
        :param key:
        :param obj:
        :param flush: When true Producer will be SyncProducer waiting for delivery.
        :param retry:
        :return:
        """
        if settings.KAFKA_SERVICE_MOCK:
            logger.warning("Kafka Service - mocking request. Send skipped")
            return
        if correlation_id is None:
            correlation_id = uuid4().hex
        logger.info(f"Sending payload with correlation_id({correlation_id})")
        try:
            future = self._producer.send(topic=topic, key=key, value=obj)
            logger.info(f"Flushing messages for correlation_id({correlation_id})")
            self._producer.flush(settings.KAFKA_FLUSH_TIMEOUT)
            logger.info(f"Waiting for ACKS for correlation_id({correlation_id})")
            record_metadata: RecordMetadata = future.get(settings.KAFKA_POLL_TIMEOUT)
            if settings.DEBUG:
                logger.debug(f"Received ack ({correlation_id}) with metadata: {record_metadata}")
            else:
                logger.info(f"Received ACKS for correlation_id({correlation_id})")
        except KafkaError as e:
            logger.exception(f"Exception for correlation_id({correlation_id}) - {e}")
            raise KafkaServiceException(e) from e

    def cm_send_payment_notification(self, key, payload, correlation_id=None):
        data = {
            "event_type": self.EventTypesEnum.PAYMENT_NOTIFICATION,
            "event_subtype": self.EventSubTypesEnum.CHINA_MOBILE,
            "payload": payload,
        }
        self._send(topic=settings.KAFKA_TOPIC_NAME, key=key, obj=data, correlation_id=correlation_id)

    def antstream_send_backpack_activation(self, key, payload, correlation_id=None):
        data = {
            "event_type": self.EventTypesEnum.BACKPACK_ACTIVATE,
            "event_subtype": self.EventSubTypesEnum.ANTSTREAM,
            "payload": payload,
        }
        self._send(topic=settings.KAFKA_TOPIC_NAME, key=key, obj=data, correlation_id=correlation_id)

    def send_backpack_activation(self, key, payload, correlation_id=None):
        data = {
            "event_type": self.EventTypesEnum.BACKPACK_ACTIVATE,
            "event_subtype": self.EventSubTypesEnum.NONE,
            "payload": payload,
        }
        self._send(topic=settings.KAFKA_TOPIC_NAME, key=key, obj=data, correlation_id=correlation_id)

    def send_subscription_deactivation(self, key, payload, correlation_id=None):
        data = {
            "event_type": self.EventTypesEnum.SUBSCRIPTION_DEACTIVATE,
            "event_subtype": self.EventSubTypesEnum.NONE,
            "payload": payload,
        }
        self._send(topic=settings.KAFKA_TOPIC_NAME, key=key, obj=data, correlation_id=correlation_id)


KafkaService = KafkaService()
