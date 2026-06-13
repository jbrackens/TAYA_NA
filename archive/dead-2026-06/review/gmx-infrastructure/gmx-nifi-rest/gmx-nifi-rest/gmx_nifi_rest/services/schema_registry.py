import logging

import ujson
from schema_registry.client import SchemaRegistryClient
from schema_registry.serializers import MessageSerializer

from gmx_nifi_rest import settings
from gmx_nifi_rest.models import ARN
from gmx_nifi_rest.services import BaseService
from gmx_nifi_rest.services.redis_service import RedisService

logger = logging.getLogger(__name__)


class SchemaRegistry(BaseService):
    _client: SchemaRegistryClient = None

    @classmethod
    async def initialize(cls):
        if cls._client is None:
            cls._client = SchemaRegistryClient(url=settings.SCHEMA_REGISTRY_URL)
            logger.info("{}: SchemaRegistry client started.".format(cls.__name__))

    @classmethod
    async def deinitialize(cls):
        pass

    @classmethod
    async def prepare_bytes_to_send(cls, data, topic: str, method: str):
        subject = f"{topic}-{method}"

        avro_schema = await RedisService.get_avro_schema(subject)

        if avro_schema is None:
            async with await RedisService.get_lock(ARN.avro_schema(subject=subject)) as lock:
                assert lock.valid
                if not avro_schema:
                    avro_schema = await RedisService.get_avro_schema(subject)
                if avro_schema is None:
                    logger.info("Calling Schema Registry for latest Avro Schema.")
                    avro_schema = cls._client.get_schema(subject)

                    schema_for_redis = avro_schema._asdict()
                    schema_for_redis.pop("schema", False)

                    await RedisService.set_avro_schema(ujson.dumps(schema_for_redis), subject)

        message_serializer = MessageSerializer(cls._client)
        bytes_to_send = message_serializer.encode_record_with_schema_id(avro_schema.schema_id, data)

        # this is because the message encoded reserved 5 bytes for the schema_id
        assert len(bytes_to_send) > 5
        assert isinstance(bytes_to_send, bytes)

        return bytes_to_send
