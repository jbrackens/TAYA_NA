import logging

import ujson
from django.conf import settings
from schema_registry.client import SchemaRegistryClient
from schema_registry.serializers import MessageSerializer

from virtual_shop.tools import ARN

from .redis_service import RedisService

logger = logging.getLogger(__name__)


class SchemaRegistryException(Exception):
    pass


class SchemaRegistry:
    _client: SchemaRegistryClient = None

    def __init__(self):
        if self._client is None:
            self._client = SchemaRegistryClient(url=settings.SCHEMA_REGISTRY_URL)
            logger.info("{}: SchemaRegistry client started.".format(self.__class__.__name__))

    def deinitialize(self):
        pass

    def prepare_bytes_to_send(self, data, topic: str, method: str):
        subject = f"{topic}-{method}"

        avro_schema = RedisService.get_avro_schema(subject)

        if avro_schema is None:
            with RedisService.get_lock(ARN.avro_schema(subject=subject)) as lock:
                if not avro_schema:
                    avro_schema = RedisService.get_avro_schema(subject)
                if avro_schema is None:
                    logger.info("Calling Schema Registry for latest Avro Schema.")
                    avro_schema = self._client.get_schema(subject)
                    if avro_schema.schema_id is None:
                        logger.info(f"Schema for subject {subject} not found!.")
                        raise SchemaRegistryException

                    schema_for_redis = avro_schema._asdict()
                    schema_for_redis.pop("schema", False)

                    RedisService.set_avro_schema(ujson.dumps(schema_for_redis), subject)

        message_serializer = MessageSerializer(self._client)
        bytes_to_send = message_serializer.encode_record_with_schema_id(avro_schema.schema_id, data)

        # this is because the message encoded reserved 5 bytes for the schema_id
        assert len(bytes_to_send) > 5
        assert isinstance(bytes_to_send, bytes)

        return bytes_to_send


SchemaRegistry = SchemaRegistry()
