import logging
import uuid
from enum import Enum
from typing import List, Optional, Union

from django.conf import settings
from kafka import KafkaProducer
from kafka.errors import KafkaError
from kafka.producer.future import RecordMetadata
from kafka.producer.record_accumulator import AtomicInteger
from pydantic import BaseModel

from services.schema_registry import SchemaRegistry

logger = logging.getLogger(f"{__name__}.KafkaService")


class ServiceException(Exception):
    pass


class KafkaServiceException(ServiceException):
    pass


class KafkaServiceBufferException(KafkaServiceException):
    pass


_KafkaProducerCounter = AtomicInteger()


class KafkaService:
    """
    This class is used to open communication with Kafka streaming service.
    """

    _producer: KafkaProducer
    KAFKA_POLL_TIMEOUT = settings.KAFKA_POLL_TIMEOUT
    KAFKA_FLUSH_TIMEOUT = settings.KAFKA_FLUSH_TIMEOUT

    class TopicsSchemaRegistry(Enum):
        VIRTUAL_SHOP_BONUS = settings.KAFKA_TOPIC_NAME_VIRTUAL_SHOP_BONUS
        NOTIFICATION = settings.KAFKA_TOPIC_NAME_NOTIFICATION_SERVICE

    class Models:
        class CustomerKey(BaseModel):
            customerId: str

        class VirtualShopBonus(BaseModel):
            company_id: str
            user_sub: str
            external_user_id: str
            bonus_single: Union[str, int, None]
            bonus_multiple: Optional[List[Union[str, int]]]
            bonus_value: Union[str, int, None]
            bonus_type: str
            amount: Union[str, int]
            process_id: str
            order_line_uid: str
            transaction_id: str

        class Notification(BaseModel):
            uuid: str
            createdDateUTC: int
            companyId: Optional[str]
            externalUserId: str
            action: str
            notificationTrigger: Optional[str]
            Priority: Optional[str]
            payload: dict
            operationTarget: Optional[str]

        class NotificationPayload(BaseModel):
            value: Optional[str]

    def __init__(self):
        if settings.KAFKA_SERVICE_MOCK:
            logger.warning("Kafka service will be mocked!")
            return
        client_id = f"{settings.KAFKA_CLIENT_ID}_{_KafkaProducerCounter.increment()}"
        logger.info(f"Staring KafkaProducer({client_id})")
        self._producer = KafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            client_id=client_id,
            acks="all",
            retries=settings.KAFKA_MESSAGE_MAX_RETRIES,
            batch_size=0,
        )

    @staticmethod
    def get_correlation_id() -> str:
        return uuid.uuid4().hex

    def send_data(
        self,
        data: BaseModel,
        topic_name: TopicsSchemaRegistry,
        message_key: Optional[Union[str, BaseModel]] = None,
        topic_for_company: str = None,  # topic specific for company
        correlation_id=None,
    ):
        if settings.KAFKA_SERVICE_MOCK:
            logger.warning("Kafka Service - mocking request. Send skipped")
            return
        if correlation_id is None:
            correlation_id = self.get_correlation_id()
        logger.info(f"Sending payload with correlation_id({correlation_id})")

        data_to_send = data.dict()
        # self._producer.metrics()

        if topic_for_company is not None:
            topic_name_value = topic_name.value.get(topic_for_company)
        else:
            topic_name_value = topic_name.value
        bytes_to_send = SchemaRegistry.prepare_bytes_to_send(
            data_to_send, topic_name_value, settings.SCHEMA_REGISTRY_VALUE
        )
        if message_key is not None:
            message_key = SchemaRegistry.prepare_bytes_to_send(
                message_key.dict(), topic_name_value, settings.SCHEMA_REGISTRY_KEY
            )
        try:
            future = self._producer.send(topic_name_value, bytes_to_send, key=message_key)
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

    def virtual_shop_send_bonus(self, data: Models.VirtualShopBonus, data_key: Models.CustomerKey):
        return self.send_data(data, self.TopicsSchemaRegistry.VIRTUAL_SHOP_BONUS, message_key=data_key)

    def virtual_shop_send_notification(self, data: Models.Notification, data_key: Models.CustomerKey):
        return self.send_data(
            data,
            self.TopicsSchemaRegistry.NOTIFICATION,
            message_key=data_key,
        )


KafkaService = KafkaService()
