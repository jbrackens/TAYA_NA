import io
import logging
from enum import Enum
from pathlib import Path

import fastavro
import ujson

from gmx_nifi_rest import settings
from gmx_nifi_rest.services import BaseService

logger = logging.getLogger(__name__)


class AvroService(BaseService):
    _registry: dict = None

    class UsedSchemas(Enum):
        VIRTUAL_SHOP_PAYMENT = "net.flipsports.gmx.nifi.VirtualShopPayment"
        VIRTUAL_SHOP_ORDER_LINE_RESOLVE = "net.flipsports.gmx.nifi.VirtualShopOrderLineResolve"
        WALLET_TOP_UP = "net.flipsports.gmx.nifi.CasinoAndSportBetsTopupData"

        @classmethod
        def to_items(cls) -> tuple:
            return (cls.VIRTUAL_SHOP_PAYMENT.value, cls.VIRTUAL_SHOP_ORDER_LINE_RESOLVE.value, cls.WALLET_TOP_UP.value)

    @classmethod
    async def initialize(cls, *args, **kwargs):
        cls._registry = dict()
        logger.info("Looking for *.avsc files")
        for filename in Path(settings.AVRO_SCHEMA_BASE_DIR).glob("**/*.avsc"):
            logger.info("Found {}".format(filename))
            with open(str(filename), "r") as fh:
                schema = fastavro.parse_schema(ujson.load(fh))
            schema_name = schema.get("name")
            if schema_name not in cls.UsedSchemas.to_items():
                logger.info("\tSkipping as not used: {}".format(schema_name))
            cls._registry[schema_name] = schema

    @classmethod
    async def deinitialize(cls):
        pass

    @classmethod
    def validate(cls, datum: dict, schema_name: str):
        if not fastavro.validate(datum, cls._registry.get(schema_name), raise_errors=False):
            raise ValueError("Given object {} is not valid schema: {}".format(datum, schema_name))

    @classmethod
    def encode(cls, datum: dict, schema_name: str) -> bytes:
        cls.validate(datum, schema_name)
        with io.BytesIO() as fh:
            fastavro.schemaless_writer(fh, cls._registry.get(schema_name), datum)
            result = fh.getvalue()
        return result

    @classmethod
    def decode(cls, datum: bytes, schema_name: str) -> dict:
        with io.BytesIO() as fh:
            fh.write(datum)
            fh.seek(0)
            # noinspection PyTypeChecker
            result: dict = fastavro.schemaless_reader(fh, cls._registry.get(schema_name))
        return result
