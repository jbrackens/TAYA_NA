import asyncio
import logging
import uuid
from enum import Enum
from typing import Optional, Union

import aiokafka
from pydantic import BaseModel

from gmx_nifi_rest import settings
from gmx_nifi_rest.services import BaseService
from gmx_nifi_rest.services.avro_schema import AvroService
from gmx_nifi_rest.services.redis_service import RedisService
from gmx_nifi_rest.services.schema_registry import SchemaRegistry

logger = logging.getLogger(__name__)


class KafkaService(BaseService):
    _producer: aiokafka.AIOKafkaProducer = None

    class Topics(Enum):
        VIRTUAL_SHOP_PAYMENT = settings.KAFKA.TOPICS.VIRTUAL_SHOP_PAYMENT
        VIRTUAL_SHOP_ORDER_LINE_RESOLVE = settings.KAFKA.TOPICS.VIRTUAL_SHOP_ORDER_LINE_RESOLVE
        WALLET_TOP_UP = settings.KAFKA.TOPICS.WALLET_TOP_UP

    class TopicsSchemaRegistry(Enum):
        TAG_MANAGER_CHANGE_STATE = settings.KAFKA.TOPICS.TAG_MANAGER_CHANGE_STATE
        CASINO_2AM_ACTION = settings.KAFKA.TOPICS.CASINO_2AM_ACTION
        TN_AUTODOC_VERIFY = settings.KAFKA.TOPICS.AUTODOC_VERIFY

    class Models:
        class VirtualShopPayment(BaseModel):
            price: str
            title: str
            transaction_id: str
            process_id: str
            originator_id: str
            user_sub: str
            external_user_id: str
            company_id: str

        class VirtualShopOrderLineResolve(BaseModel):
            issue_id: str
            order_line_id: str
            resolved_lines_array: str

        class WalletTopUp(BaseModel):
            external_user_id: str
            external_transaction_id: str
            amount: float
            title: str
            created_date: int
            created_date_value: str
            company_id: str
            operation_subtype: str
            context_data: dict

        class TagManagerStateChange(BaseModel):
            uuid: str
            createdDateUTC: int
            companyId: str
            externalUserId: str
            userId: Optional[str]
            email: Optional[str]
            action: str
            operationTrigger: str
            operationTarget: str
            payload: dict

        class TagManagerStateChangeKey(BaseModel):
            externalUserId: str

        class AutoDocVerifyKey(TagManagerStateChangeKey):
            pass

        class Casino2amAction(BaseModel):
            uuid: str
            createdDateUTC: int
            companyId: str
            externalUserId: str
            userId: Optional[str]
            email: Optional[str]
            action: str

        class Casino2amActionKey(BaseModel):
            externalUserId: str

        class AutoDocVerifyNotification(Casino2amAction):
            status: str

    @classmethod
    async def initialize(cls):
        if cls._producer is None:
            cls._producer = aiokafka.AIOKafkaProducer(
                loop=asyncio.get_event_loop(), bootstrap_servers=settings.KAFKA.SERVERS,
            )
            await cls._producer.start()
            logger.info("{}: Kafka producer started.".format(cls.__name__))

    @staticmethod
    def get_correlation_id() -> str:
        return uuid.uuid4().hex

    @classmethod
    async def send_data(
        cls,
        data: BaseModel,
        topic_name: Union[Topics, TopicsSchemaRegistry],
        avro_schema: AvroService.UsedSchemas = None,
        message_key: Optional[Union[str, BaseModel]] = None,
        topic_for_company: str = None,  # topic specific for company
    ):
        data_to_send = data.dict()

        if isinstance(topic_name, cls.TopicsSchemaRegistry):
            if topic_for_company is not None:
                topic_name_value = topic_name.value.get(topic_for_company)
            else:
                topic_name_value = topic_name.value
            bytes_to_send = await SchemaRegistry.prepare_bytes_to_send(
                data_to_send, topic_name_value, settings.SCHEMA_REGISTRY_VALUE
            )
            if message_key is not None:
                message_key = await SchemaRegistry.prepare_bytes_to_send(
                    message_key.dict(), topic_name_value, settings.SCHEMA_REGISTRY_KEY
                )
        else:
            topic_name_value = topic_name.value
            bytes_to_send: bytes = AvroService.encode(data_to_send, avro_schema.value)
            if message_key is not None:
                message_key = message_key.encode()

        await cls._producer.send_and_wait(topic_name_value, bytes_to_send, key=message_key)

    @classmethod
    async def send_virtual_shop_payment(cls, data: Models.VirtualShopPayment):
        return await cls.send_data(
            data,
            cls.Topics.VIRTUAL_SHOP_PAYMENT,
            AvroService.UsedSchemas.VIRTUAL_SHOP_PAYMENT,
            message_key=data.user_sub,
        )

    @classmethod
    async def send_virtual_shop_order_line(cls, data: Models.VirtualShopOrderLineResolve):
        return await cls.send_data(
            data, cls.Topics.VIRTUAL_SHOP_ORDER_LINE_RESOLVE, AvroService.UsedSchemas.VIRTUAL_SHOP_ORDER_LINE_RESOLVE
        )

    @classmethod
    async def send_wallet_top_up(cls, data: Models.WalletTopUp):
        return await cls.send_data(
            data, cls.Topics.WALLET_TOP_UP, AvroService.UsedSchemas.WALLET_TOP_UP, message_key=data.external_user_id
        )

    @classmethod
    async def send_tag_manager_state_change(
        cls, data: Models.TagManagerStateChange, data_key: Models.TagManagerStateChangeKey, company_name: str
    ):
        return await cls.send_data(
            data,
            cls.TopicsSchemaRegistry.TAG_MANAGER_CHANGE_STATE,
            message_key=data_key,
            topic_for_company=company_name,
        )

    @classmethod
    async def send_casino_2am_action(
        cls, data: Models.TagManagerStateChange, data_key: Models.TagManagerStateChangeKey, company_name: str
    ):
        return await cls.send_data(
            data, cls.TopicsSchemaRegistry.CASINO_2AM_ACTION, message_key=data_key, topic_for_company=company_name
        )

    @classmethod
    async def send_autodoc_action(
        cls, data: Models.AutoDocVerifyNotification, data_key: Models.AutoDocVerifyKey, company_name: str
    ):
        return await cls.send_data(
            data, cls.TopicsSchemaRegistry.TN_AUTODOC_VERIFY, message_key=data_key, topic_for_company=company_name
        )

    @classmethod
    async def health_check(cls):
        if not cls._initialization_lock.is_set():
            await asyncio.wait_for(cls.boot_up(), timeout=30)
        try:
            cls.set_health_check_details("Started waiting for redis and Avro")
            await asyncio.gather(
                RedisService.wait_until_initialized(),
                AvroService.wait_until_initialized(),
                SchemaRegistry.wait_until_initialized(),
            )
        except Exception as e:
            logger.exception("Redis or AVRO service initialization error {}".format(e))
            cls.set_health_check_details("Redis or AVRO service initialization error")
            return False
        # noinspection PyTypeChecker
        cls.set_health_check_details(None)
        return True

    @classmethod
    async def deinitialize(cls):
        logger.info("{}: Waiting for all pending messages to be delivered or expire.".format(cls.__name__))
        await cls._producer.stop()
